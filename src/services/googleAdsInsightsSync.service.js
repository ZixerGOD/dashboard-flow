const axios = require('axios');
const { env } = require('../config/env');
const { getPool } = require('../config/database');
const { normalizeCampaignKey, upsertDailyPaidInsights } = require('../repositories/paid_insights.repository');

function escapeGaqlString(value) {
  return String(value || '').replace(/'/g, "\\'");
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return text;
}

async function getGoogleAccessToken() {
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET || !env.GOOGLE_ADS_REFRESH_TOKEN) {
    throw new Error('Missing Google Ads OAuth env vars (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)');
  }

  const payload = new URLSearchParams({
    client_id: env.GOOGLE_ADS_CLIENT_ID,
    client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const { data } = await axios.post('https://oauth2.googleapis.com/token', payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000
  });

  if (!data?.access_token) {
    throw new Error('Google OAuth token response missing access_token');
  }

  return data.access_token;
}

function buildGaql({ startDate, endDate, campaignName }) {
  const where = [`segments.date BETWEEN '${startDate}' AND '${endDate}'`];

  if (campaignName) {
    where.push(`campaign.name = '${escapeGaqlString(campaignName)}'`);
  }

  return [
    'SELECT',
    '  segments.date,',
    '  campaign.id,',
    '  campaign.name,',
    '  customer.id,',
    '  customer.descriptive_name,',
    '  customer.currency_code,',
    '  metrics.cost_micros,',
    '  metrics.clicks,',
    '  metrics.impressions,',
    '  metrics.conversions,',
    '  metrics.unique_users',
    'FROM campaign',
    `WHERE ${where.join(' AND ')}`
  ].join(' ');
}

function normalizeGoogleCustomerId(value) {
  return String(value || '').replace(/[^0-9]/g, '').trim();
}

async function runGoogleAdsSearchStream({ customerId, accessToken, query, timeout = 40000 }) {
  const version = env.GOOGLE_ADS_API_VERSION || 'v20';
  const endpointCustomerId = normalizeGoogleCustomerId(customerId);
  const loginCustomerId = normalizeGoogleCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || endpointCustomerId);
  const { data } = await axios.post(
    `https://googleads.googleapis.com/${version}/customers/${endpointCustomerId}/googleAds:searchStream`,
    { query },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': loginCustomerId,
        'Content-Type': 'application/json'
      },
      timeout
    }
  );

  const rows = [];
  for (const chunk of Array.isArray(data) ? data : [data]) {
    if (Array.isArray(chunk?.results)) {
      rows.push(...chunk.results);
    }
  }

  return rows;
}

async function ensureGoogleAccountTreeSchema(client) {
  await client.query(
    `
      CREATE TABLE IF NOT EXISTS bi.dim_ad_account (
        source varchar(20) NOT NULL,
        account_id varchar(64) NOT NULL,
        account_name varchar(255) NOT NULL,
        parent_account_id varchar(64),
        level integer NOT NULL DEFAULT 0,
        is_manager boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (source, account_id)
      )
    `
  );

  await client.query('CREATE INDEX IF NOT EXISTS idx_dim_ad_account_source_parent ON bi.dim_ad_account(source, parent_account_id)');
}

async function upsertGoogleAccountTreeNodes(nodes) {
  const pool = getPool();
  if (!pool || !Array.isArray(nodes) || !nodes.length) {
    return { upserted: 0 };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureGoogleAccountTreeSchema(client);

    let upserted = 0;
    for (const node of nodes) {
      if (!node?.account_id) {
        continue;
      }

      await client.query(
        `
          INSERT INTO bi.dim_ad_account (
            source,
            account_id,
            account_name,
            parent_account_id,
            level,
            is_manager,
            updated_at
          ) VALUES ('GOOGLE', $1, $2, $3, $4, $5, now())
          ON CONFLICT (source, account_id)
          DO UPDATE SET
            account_name = EXCLUDED.account_name,
            parent_account_id = EXCLUDED.parent_account_id,
            level = EXCLUDED.level,
            is_manager = EXCLUDED.is_manager,
            updated_at = now()
        `,
        [
          String(node.account_id || '').trim(),
          String(node.account_name || node.account_id || '').trim(),
          String(node.parent_account_id || '').trim() || null,
          Number(node.level || 0),
          Boolean(node.is_manager)
        ]
      );

      upserted += 1;
    }

    await client.query('COMMIT');
    return { upserted };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function fetchGoogleCustomerName(customerId, accessToken) {
  try {
    const rows = await runGoogleAdsSearchStream({
      customerId,
      accessToken,
      query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1',
      timeout: 20000
    });

    const row = rows[0];
    const name = row?.customer?.descriptiveName || row?.customer?.descriptive_name || '';
    return String(name || '').trim() || String(customerId || '').trim();
  } catch (error) {
    return String(customerId || '').trim();
  }
}

async function fetchGoogleAdsAccountTree(accessToken) {
  const rootId = normalizeGoogleCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || env.GOOGLE_ADS_CUSTOMER_ID || '');
  if (!rootId) {
    return [];
  }

  const rootName = await fetchGoogleCustomerName(rootId, accessToken);
  const nodesById = new Map();
  const visitedManagers = new Set();
  const queue = [rootId];

  nodesById.set(rootId, {
    account_id: rootId,
    account_name: rootName,
    parent_account_id: null,
    level: 0,
    is_manager: true
  });

  while (queue.length) {
    const managerId = queue.shift();
    if (!managerId || visitedManagers.has(managerId)) {
      continue;
    }

    visitedManagers.add(managerId);

    const rows = await runGoogleAdsSearchStream({
      customerId: managerId,
      accessToken,
      query: [
        'SELECT',
        '  customer_client.id,',
        '  customer_client.descriptive_name,',
        '  customer_client.manager',
        'FROM customer_client',
        'WHERE customer_client.level = 1'
      ].join(' '),
      timeout: 30000
    });

    const parentLevel = Number(nodesById.get(managerId)?.level || 0);

    for (const row of rows) {
      const rawChildId = row?.customerClient?.id || row?.customer_client?.id;
      const childId = normalizeGoogleCustomerId(rawChildId);
      if (!childId) {
        continue;
      }

      const rawName = row?.customerClient?.descriptiveName || row?.customerClient?.descriptive_name || row?.customer_client?.descriptive_name || row?.customer_client?.descriptiveName || '';
      const childName = String(rawName || '').trim() || childId;
      const isManager = Boolean(row?.customerClient?.manager ?? row?.customer_client?.manager);
      const childLevel = parentLevel + 1;

      const existing = nodesById.get(childId);
      if (!existing || childLevel < Number(existing.level || Number.MAX_SAFE_INTEGER)) {
        nodesById.set(childId, {
          account_id: childId,
          account_name: childName,
          parent_account_id: managerId,
          level: childLevel,
          is_manager: isManager
        });
      }

      if (isManager && !visitedManagers.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return [...nodesById.values()].sort((a, b) => {
    const levelDiff = Number(a.level || 0) - Number(b.level || 0);
    if (levelDiff !== 0) {
      return levelDiff;
    }

    return String(a.account_name || '').localeCompare(String(b.account_name || ''));
  });
}

function mapGoogleRow(row) {
  const campaignName = row?.campaign?.name || '';
  const campaignId = row?.campaign?.id || null;
  const date = row?.segments?.date || null;
  const currencyCode = row?.customer?.currencyCode || row?.customer?.currency_code || null;
  const customerId = normalizeGoogleCustomerId(row?.customer?.id);
  const costMicros = toNumber(row?.metrics?.costMicros ?? row?.metrics?.cost_micros);
  const clicks = toNumber(row?.metrics?.clicks);
  const impressions = toNumber(row?.metrics?.impressions);
  const reach = toNumber(row?.metrics?.uniqueUsers ?? row?.metrics?.unique_users);
  const conversions = toNumber(row?.metrics?.conversions);

  return {
    day: date,
    source: 'GOOGLE',
    platform: 'GOOGLE',
    campaign_key: normalizeCampaignKey(campaignName),
    campaign_name: campaignName,
    currency_code: currencyCode,
    spend: costMicros / 1000000,
    clicks,
    impressions,
    reach,
    conversions,
    provider_campaign_id: campaignId ? String(campaignId) : null,
    provider_account_id: customerId || normalizeGoogleCustomerId(env.GOOGLE_ADS_CUSTOMER_ID) || null,
    provider_account_name: String(row?.customer?.descriptiveName || row?.customer?.descriptive_name || '').trim() || null,
    raw_payload: row
  };
}

async function syncGoogleAdsInsightsRange({ startDate, endDate, campaignName = '' }) {
  const safeStartDate = toIsoDate(startDate);
  const safeEndDate = toIsoDate(endDate);

  if (!safeStartDate || !safeEndDate) {
    throw new Error('Invalid date range for Google Ads sync. Use YYYY-MM-DD');
  }

  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_DEVELOPER_TOKEN || !env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    throw new Error('Missing Google Ads env vars (CUSTOMER_ID, DEVELOPER_TOKEN, LOGIN_CUSTOMER_ID)');
  }

  const accessToken = await getGoogleAccessToken();
  const query = buildGaql({
    startDate: safeStartDate,
    endDate: safeEndDate,
    campaignName: String(campaignName || '').trim()
  });

  const rows = await runGoogleAdsSearchStream({
    customerId: env.GOOGLE_ADS_CUSTOMER_ID,
    accessToken,
    query,
    timeout: 40000
  });

  const mapped = rows.map(mapGoogleRow).filter((row) => row.day && row.campaign_key && row.campaign_name);
  const upsert = await upsertDailyPaidInsights(mapped);
  const hierarchyNodes = await fetchGoogleAdsAccountTree(accessToken);
  const hierarchyUpsert = await upsertGoogleAccountTreeNodes(hierarchyNodes);

  return {
    source: 'GOOGLE',
    start_date: safeStartDate,
    end_date: safeEndDate,
    campaign_name: String(campaignName || '').trim() || null,
    fetched_rows: rows.length,
    mapped_rows: mapped.length,
    upsert,
    account_tree: {
      nodes: hierarchyNodes.length,
      upserted: hierarchyUpsert.upserted
    }
  };
}

module.exports = {
  syncGoogleAdsInsightsRange
};
