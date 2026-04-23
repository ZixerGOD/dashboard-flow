const axios = require('axios');
const { env } = require('../config/env');
const {
  normalizeCampaignKey,
  upsertDailyPaidInsights,
  getCoverageByRange
} = require('../repositories/paid_insights.repository');

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

function normalizeMetaPlatform(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'facebook') {
    return 'FB';
  }

  if (normalized === 'instagram') {
    return 'IG';
  }

  return 'META';
}

function parseMetaAccountIds() {
  const configured = String(env.META_AD_ACCOUNT_IDS || '').trim();
  const fallback = String(env.META_AD_ACCOUNT_ID || '').trim();

  const ids = (configured ? configured.split(',') : [])
    .map((value) => String(value || '').trim().replace(/^act_/i, ''))
    .filter(Boolean);

  if (!ids.length && fallback) {
    ids.push(fallback.replace(/^act_/i, ''));
  }

  return [...new Set(ids)];
}

async function fetchMetaInsights({ accountId, accessToken, startDate, endDate, campaignName }) {
  const version = env.META_GRAPH_VERSION || 'v20.0';
  const endpoint = `https://graph.facebook.com/${version}/act_${accountId}/insights`;
  const attributionWindows = String(env.META_ATTRIBUTION_WINDOWS || '').trim();

  const params = {
    access_token: accessToken,
    level: 'campaign',
    breakdowns: 'publisher_platform',
    time_increment: 1,
    use_account_attribution_setting: 'true',
    fields: 'account_id,account_name,campaign_id,campaign_name,account_currency,spend,clicks,impressions,reach,actions,cost_per_action_type,date_start,date_stop',
    time_range: JSON.stringify({ since: startDate, until: endDate }),
    limit: 500
  };

  if (attributionWindows) {
    params.action_attribution_windows = JSON.stringify(
      attributionWindows
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    );
  }

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
  const platform = normalizeMetaPlatform(row?.publisher_platform);

  return {
    day: row?.date_start || null,
    source: 'META',
    platform,
    campaign_key: normalizeCampaignKey(campaignName),
    campaign_name: campaignName,
    currency_code: row?.account_currency || null,
    spend: toNumber(row?.spend),
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    reach: toNumber(row?.reach),
    conversions: extractLeadLikeConversions(row?.actions),
    provider_campaign_id: row?.campaign_id ? String(row.campaign_id) : null,
    provider_account_id: row?.account_id ? String(row.account_id) : accountId,
    provider_account_name: String(row?.account_name || '').trim() || null,
    raw_payload: row
  };
}

async function syncMetaInsightsRange({ startDate, endDate, campaignName = '', accountId = '' }) {
  const safeStartDate = toIsoDate(startDate);
  const safeEndDate = toIsoDate(endDate);

  if (!safeStartDate || !safeEndDate) {
    throw new Error('Invalid date range for Meta sync. Use YYYY-MM-DD');
  }

  const accessToken = String(env.META_ACCESS_TOKEN || '').trim();
  const selectedAccount = String(accountId || '').trim().replace(/^act_/i, '');
  const accountIds = selectedAccount ? [selectedAccount] : parseMetaAccountIds();

  if (!accessToken) {
    throw new Error('Missing META_ACCESS_TOKEN env var');
  }

  if (!accountIds.length) {
    throw new Error('Missing META_AD_ACCOUNT_ID/META_AD_ACCOUNT_IDS env var');
  }

  const perAccount = [];
  const mapped = [];

  for (const currentAccountId of accountIds) {
    const rows = await fetchMetaInsights({
      accountId: currentAccountId,
      accessToken,
      startDate: safeStartDate,
      endDate: safeEndDate,
      campaignName: String(campaignName || '').trim()
    });

    const mappedRows = rows
      .map((row) => mapMetaRow(row, currentAccountId))
      .filter((row) => row.day && row.campaign_key && row.campaign_name);

    perAccount.push({
      account_id: currentAccountId,
      fetched_rows: rows.length,
      mapped_rows: mappedRows.length
    });

    mapped.push(...mappedRows);
  }

  const upsert = await upsertDailyPaidInsights(mapped);
  const fetchedRows = perAccount.reduce((sum, item) => sum + item.fetched_rows, 0);

  return {
    source: 'META',
    start_date: safeStartDate,
    end_date: safeEndDate,
    campaign_name: String(campaignName || '').trim() || null,
    account_ids: accountIds,
    fetched_rows: fetchedRows,
    mapped_rows: mapped.length,
    per_account: perAccount,
    upsert
  };
}

async function shouldSyncMetaRange({ startDate, endDate, campaignName = '' }) {
  const coverage = await getCoverageByRange({
    source: 'META',
    startDate,
    endDate,
    campaignName
  });

  return {
    should_sync: !coverage.is_complete,
    coverage
  };
}

module.exports = {
  syncMetaInsightsRange,
  shouldSyncMetaRange
};
