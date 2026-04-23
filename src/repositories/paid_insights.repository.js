const { getPool } = require('../config/database');

let paidInsightsSchemaEnsured = false;

function normalizeCampaignKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function toDateOnly(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSource(value) {
  const source = String(value || '').trim().toUpperCase();
  if (!source) {
    return '';
  }

  if (source === 'FACEBOOK' || source === 'FB') {
    return 'META';
  }

  return source;
}

function normalizePaidInsightRow(row) {
  const source = normalizeSource(row.source);
  const platform = normalizeSource(row.platform || source);
  const campaignName = String(row.campaign_name || '').trim();
  const campaignKey = String(row.campaign_key || normalizeCampaignKey(campaignName)).trim();

  return {
    day: toDateOnly(row.day),
    source,
    platform,
    campaign_key: campaignKey,
    campaign_name: campaignName,
    currency_code: String(row.currency_code || '').trim() || null,
    spend: toNumber(row.spend, 0),
    clicks: toInteger(row.clicks, 0),
    impressions: toInteger(row.impressions, 0),
    reach: toInteger(row.reach, 0),
    conversions: toNumber(row.conversions, 0),
    provider_campaign_id: String(row.provider_campaign_id || '').trim() || null,
    provider_account_id: String(row.provider_account_id || '').trim() || null,
    provider_account_name: String(row.provider_account_name || '').trim() || null,
    raw_payload: row.raw_payload || null
  };
}

async function ensurePaidInsightsSchema(client) {
  if (paidInsightsSchemaEnsured) {
    return;
  }

  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ADD COLUMN IF NOT EXISTS platform varchar(20)');
  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ADD COLUMN IF NOT EXISTS provider_account_name varchar(255)');
  await client.query(`UPDATE bi.fact_paid_campaign_daily SET platform = COALESCE(NULLIF(platform, ''), source) WHERE platform IS NULL OR platform = ''`);
  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ALTER COLUMN platform SET NOT NULL');
  await client.query('ALTER TABLE bi.fact_paid_campaign_daily DROP CONSTRAINT IF EXISTS fact_paid_campaign_daily_pkey');
  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ADD PRIMARY KEY (day, source, campaign_key, platform)');
  paidInsightsSchemaEnsured = true;
}

async function upsertDailyPaidInsights(rows) {
  const pool = getPool();

  if (!pool) {
    return { upserted: 0, skipped: rows?.length || 0 };
  }

  const incoming = Array.isArray(rows) ? rows : [];
  if (!incoming.length) {
    return { upserted: 0, skipped: 0 };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensurePaidInsightsSchema(client);

    let upserted = 0;
    let skipped = 0;

    for (const item of incoming) {
      const row = normalizePaidInsightRow(item);

      if (!row.source || !row.campaign_key || !row.campaign_name) {
        skipped += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO bi.fact_paid_campaign_daily (
            day,
            source,
            platform,
            campaign_key,
            campaign_name,
            currency_code,
            spend,
            clicks,
            impressions,
            reach,
            conversions,
            provider_campaign_id,
            provider_account_id,
            provider_account_name,
            raw_payload,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
          ON CONFLICT (day, source, campaign_key, platform)
          DO UPDATE SET
            campaign_name = EXCLUDED.campaign_name,
            currency_code = COALESCE(EXCLUDED.currency_code, bi.fact_paid_campaign_daily.currency_code),
            spend = EXCLUDED.spend,
            clicks = EXCLUDED.clicks,
            impressions = EXCLUDED.impressions,
            reach = EXCLUDED.reach,
            conversions = EXCLUDED.conversions,
            provider_campaign_id = COALESCE(EXCLUDED.provider_campaign_id, bi.fact_paid_campaign_daily.provider_campaign_id),
            provider_account_id = COALESCE(EXCLUDED.provider_account_id, bi.fact_paid_campaign_daily.provider_account_id),
            provider_account_name = COALESCE(EXCLUDED.provider_account_name, bi.fact_paid_campaign_daily.provider_account_name),
            raw_payload = EXCLUDED.raw_payload,
            updated_at = now()
        `,
        [
          row.day,
          row.source,
          row.platform,
          row.campaign_key,
          row.campaign_name,
          row.currency_code,
          row.spend,
          row.clicks,
          row.impressions,
          row.reach,
          row.conversions,
          row.provider_campaign_id,
          row.provider_account_id,
          row.provider_account_name,
          row.raw_payload
        ]
      );

      upserted += 1;
    }

    await client.query('COMMIT');
    return { upserted, skipped };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

function countExpectedDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / 86400000) + 1;
}

async function getCoverageByRange({ source, startDate, endDate, campaignName = '' }) {
  const pool = getPool();

  const normalizedSource = normalizeSource(source);
  const safeStartDate = toIsoDate(startDate);
  const safeEndDate = toIsoDate(endDate);
  const safeCampaignName = String(campaignName || '').trim();

  if (!pool || !normalizedSource || !safeStartDate || !safeEndDate) {
    return {
      source: normalizedSource,
      start_date: safeStartDate,
      end_date: safeEndDate,
      expected_days: 0,
      covered_days: 0,
      is_complete: false
    };
  }

  const expectedDays = countExpectedDays(safeStartDate, safeEndDate);

  if (!expectedDays) {
    return {
      source: normalizedSource,
      start_date: safeStartDate,
      end_date: safeEndDate,
      expected_days: 0,
      covered_days: 0,
      is_complete: false
    };
  }

  const params = [normalizedSource, safeStartDate, safeEndDate];
  let whereCampaign = '';

  if (safeCampaignName) {
    params.push(safeCampaignName);
    whereCampaign = ` AND campaign_name = $${params.length}`;
  }

  const { rows } = await pool.query(
    `
      SELECT COUNT(DISTINCT day)::int AS covered_days
      FROM bi.fact_paid_campaign_daily
      WHERE source = $1
        AND day BETWEEN $2::date AND $3::date
        ${whereCampaign}
    `,
    params
  );

  const coveredDays = Number(rows[0]?.covered_days || 0);

  return {
    source: normalizedSource,
    start_date: safeStartDate,
    end_date: safeEndDate,
    expected_days: expectedDays,
    covered_days: coveredDays,
    is_complete: coveredDays >= expectedDays
  };
}

module.exports = {
  normalizeCampaignKey,
  normalizeSource,
  upsertDailyPaidInsights,
  getCoverageByRange
};
