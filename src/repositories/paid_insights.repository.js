const { getPool } = require('../config/database');

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
  const campaignName = String(row.campaign_name || '').trim();
  const campaignKey = String(row.campaign_key || normalizeCampaignKey(campaignName)).trim();

  return {
    day: toDateOnly(row.day),
    source,
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
    raw_payload: row.raw_payload || null
  };
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
            raw_payload,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
          ON CONFLICT (day, source, campaign_key)
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
            raw_payload = EXCLUDED.raw_payload,
            updated_at = now()
        `,
        [
          row.day,
          row.source,
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

module.exports = {
  normalizeCampaignKey,
  normalizeSource,
  upsertDailyPaidInsights
};
