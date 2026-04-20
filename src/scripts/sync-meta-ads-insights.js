const axios = require('axios');
const { env } = require('../config/env');
const { getPool } = require('../config/database');
const { reconcileBiFromPublic } = require('../repositories/bi_metrics.repository');
const { normalizeCampaignKey, upsertDailyPaidInsights } = require('../repositories/paid_insights.repository');
const { parseArgs, getDateRange } = require('./paid-insights-utils');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractLeadLikeConversions(actions) {
  if (!Array.isArray(actions)) {
    return 0;
  }

  const preferredTypes = new Set([
    'lead',
    'onsite_web_lead',
    'offsite_conversion.fb_pixel_lead',
    'offsite_complete_registration_add_meta_leads',
    'complete_registration',
    'omni_complete_registration'
  ]);

  return actions.reduce((sum, action) => {
    const actionType = String(action?.action_type || '').trim();
    if (!preferredTypes.has(actionType)) {
      return sum;
    }

    return sum + toNumber(action?.value);
  }, 0);
}

function buildFiltering(campaignName) {
  if (!campaignName) {
    return null;
  }

  return JSON.stringify([
    {
      field: 'campaign.name',
      operator: 'EQUAL',
      value: campaignName
    }
  ]);
}

async function fetchMetaInsights({ accountId, accessToken, startDate, endDate, campaignName }) {
  const version = env.META_GRAPH_VERSION || 'v20.0';
  const endpoint = `https://graph.facebook.com/${version}/act_${accountId}/insights`;

  const params = {
    access_token: accessToken,
    level: 'campaign',
    time_increment: 1,
    fields: 'campaign_id,campaign_name,account_currency,spend,clicks,impressions,reach,actions,date_start,date_stop',
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: 500
  };

  const filtering = buildFiltering(campaignName);
  if (filtering) {
    params.filtering = filtering;
  }

  const rows = [];
  let nextUrl = endpoint;
  let nextParams = params;

  while (nextUrl) {
    const { data } = await axios.get(nextUrl, {
      params: nextParams,
      timeout: 40000
    });

    if (Array.isArray(data?.data)) {
      rows.push(...data.data);
    }

    nextUrl = data?.paging?.next || null;
    nextParams = null;
  }

  return rows;
}

function mapMetaRow(row, accountId) {
  const campaignName = String(row?.campaign_name || '').trim();

  return {
    day: row?.date_start || null,
    source: 'META',
    campaign_key: normalizeCampaignKey(campaignName),
    campaign_name: campaignName,
    currency_code: row?.account_currency || null,
    spend: toNumber(row?.spend),
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    reach: toNumber(row?.reach),
    conversions: extractLeadLikeConversions(row?.actions),
    provider_campaign_id: row?.campaign_id ? String(row.campaign_id) : null,
    provider_account_id: accountId,
    raw_payload: row
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { startDate, endDate } = getDateRange(args);

  const accessToken = env.META_ACCESS_TOKEN || '';
  const accountId = String(env.META_AD_ACCOUNT_ID || '266971258841914').trim();

  if (!accessToken) {
    throw new Error('Missing META_ACCESS_TOKEN env var');
  }

  if (!accountId) {
    throw new Error('Missing META_AD_ACCOUNT_ID env var');
  }

  const rows = await fetchMetaInsights({
    accountId,
    accessToken,
    startDate,
    endDate,
    campaignName: args.campaign_name ? String(args.campaign_name).trim() : ''
  });

  const mapped = rows.map((row) => mapMetaRow(row, accountId)).filter((row) => row.day && row.campaign_key && row.campaign_name);
  const upsertResult = await upsertDailyPaidInsights(mapped);
  const reconcileResult = await reconcileBiFromPublic();

  console.log(
    JSON.stringify(
      {
        source: 'META',
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
    console.error('sync-meta-ads-insights failed:', JSON.stringify(details, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
