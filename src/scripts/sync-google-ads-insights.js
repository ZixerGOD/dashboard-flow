const axios = require('axios');
const { env } = require('../config/env');
const { getPool } = require('../config/database');
const { reconcileBiFromPublic } = require('../repositories/bi_metrics.repository');
const { normalizeCampaignKey, upsertDailyPaidInsights } = require('../repositories/paid_insights.repository');
const { parseArgs, getDateRange } = require('./paid-insights-utils');

function escapeGaqlString(value) {
  return String(value || '').replace(/'/g, "\\'");
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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapGoogleRow(row) {
  const campaignName = row?.campaign?.name || '';
  const campaignId = row?.campaign?.id || null;
  const date = row?.segments?.date || null;
  const currencyCode = row?.customer?.currencyCode || row?.customer?.currency_code || null;
  const costMicros = toNumber(row?.metrics?.costMicros ?? row?.metrics?.cost_micros);
  const clicks = toNumber(row?.metrics?.clicks);
  const impressions = toNumber(row?.metrics?.impressions);
  const reach = toNumber(row?.metrics?.uniqueUsers ?? row?.metrics?.unique_users);
  const conversions = toNumber(row?.metrics?.conversions);

  return {
    day: date,
    source: 'GOOGLE',
    campaign_key: normalizeCampaignKey(campaignName),
    campaign_name: campaignName,
    currency_code: currencyCode,
    spend: costMicros / 1000000,
    clicks,
    impressions,
    reach,
    conversions,
    provider_campaign_id: campaignId ? String(campaignId) : null,
    provider_account_id: env.GOOGLE_ADS_CUSTOMER_ID || null,
    raw_payload: row
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { startDate, endDate } = getDateRange(args);

  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_DEVELOPER_TOKEN || !env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    throw new Error('Missing Google Ads env vars (CUSTOMER_ID, DEVELOPER_TOKEN, LOGIN_CUSTOMER_ID)');
  }

  const accessToken = await getGoogleAccessToken();
  const query = buildGaql({
    startDate,
    endDate,
    campaignName: args.campaign_name ? String(args.campaign_name).trim() : ''
  });

  const version = env.GOOGLE_ADS_API_VERSION || 'v20';
  const { data } = await axios.post(
    `https://googleads.googleapis.com/${version}/customers/${env.GOOGLE_ADS_CUSTOMER_ID}/googleAds:searchStream`,
    { query },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        'Content-Type': 'application/json'
      },
      timeout: 40000
    }
  );

  const rows = [];
  for (const chunk of Array.isArray(data) ? data : [data]) {
    if (Array.isArray(chunk?.results)) {
      rows.push(...chunk.results);
    }
  }

  const mapped = rows.map(mapGoogleRow).filter((row) => row.day && row.campaign_key && row.campaign_name);
  const upsertResult = await upsertDailyPaidInsights(mapped);
  const reconcileResult = await reconcileBiFromPublic();

  console.log(
    JSON.stringify(
      {
        source: 'GOOGLE',
        start_date: startDate,
        end_date: endDate,
        fetched_rows: rows.length,
        mapped_rows: mapped.length,
        upsert: upsertResult,
        bi_reconcile: reconcileResult
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    const details = error?.response?.data || error.message;
    console.error('sync-google-ads-insights failed:', JSON.stringify(details, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
