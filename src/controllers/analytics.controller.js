const { getPool } = require('../config/database');
const { MANUAL_REFRESH_COOLDOWN_MS, refreshPaidInsights } = require('../services/paidInsightsRefresh.service');
const { sendSuccess } = require('../utils/response');

const dashboardDimensionColumnMemo = new Map();

function parseIntOr(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPagination(req) {
  return {
    limit: Math.min(parseIntOr(req.query.limit || 10000, 10000), 50000),
    offset: Math.max(parseIntOr(req.query.offset || 0, 0), 0)
  };
}

function normalizePlatformFilter(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'INSTAGRAM') {
    return 'IG';
  }

  return normalized;
}

function isGooglePlatform(value) {
  return String(value || '').trim().toUpperCase() === 'GOOGLE';
}

function isMetaPlatform(value) {
  return ['META', 'FB', 'IG', 'INSTAGRAM'].includes(String(value || '').trim().toUpperCase());
}

function appendPlatformFilter({ where, params, platform, dimensionColumn }) {
  const normalized = normalizePlatformFilter(platform);
  if (!normalized) {
    return;
  }

  if (normalized === 'META') {
    params.push(['META', 'FB', 'IG']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  if (normalized === 'FB') {
    params.push(['FB', 'META']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  if (normalized === 'IG') {
    params.push(['IG', 'META']);
    where.push(`${dimensionColumn} = ANY($${params.length}::text[])`);
    return;
  }

  params.push(normalized);
  where.push(`${dimensionColumn} = $${params.length}`);
}

function buildFilters(req) {
  return {
    campaign: req.query.campaign ? String(req.query.campaign).trim() : null,
    platform: req.query.platform ? normalizePlatformFilter(req.query.platform) : req.query.source ? normalizePlatformFilter(req.query.source) : null,
    accountId: req.query.account_id ? String(req.query.account_id).trim() : null,
    startDate: req.query.start_date ? String(req.query.start_date).trim() : null,
    endDate: req.query.end_date ? String(req.query.end_date).trim() : null
  };
}

function buildWhereClauses(filters, dateColumn, dimensionColumn = 'source') {
  const where = [];
  const params = [];

  if (filters.campaign) {
    params.push(filters.campaign);
    where.push(`campaign_name = $${params.length}`);
  }

  if (filters.platform) {
    appendPlatformFilter({
      where,
      params,
      platform: filters.platform,
      dimensionColumn
    });
  }

  if (Array.isArray(filters.accountIds) && filters.accountIds.length) {
    if (filters.accountIds.length === 1) {
      params.push(filters.accountIds[0]);
      where.push(`provider_account_id = $${params.length}`);
    } else {
      params.push(filters.accountIds);
      where.push(`provider_account_id = ANY($${params.length}::text[])`);
    }
  } else if (filters.accountId) {
    params.push(filters.accountId);
    where.push(`provider_account_id = $${params.length}`);
  }

  if (filters.startDate) {
    params.push(filters.startDate);
    where.push(`${dateColumn} >= $${params.length}::date`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    where.push(`${dateColumn} <= $${params.length}::date`);
  }

  return { where, params };
}

async function getDashboardDimensionColumn(pool, viewName) {
  const cacheKey = String(viewName || '').trim();
  if (dashboardDimensionColumnMemo.has(cacheKey)) {
    return dashboardDimensionColumnMemo.get(cacheKey);
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'bi'
          AND table_name = $1
          AND column_name IN ('source', 'platform')
      `,
      [cacheKey]
    );

    const availableColumns = new Set(rows.map((row) => String(row.column_name || '').trim()));
    const resolved = availableColumns.has('platform') ? 'platform' : availableColumns.has('source') ? 'source' : 'source';
    dashboardDimensionColumnMemo.set(cacheKey, resolved);
    return resolved;
  } catch (error) {
    return 'source';
  }
}

function createPaginatedPayload(rows, total, limit, offset) {
  return {
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total
    },
    meta: {
      timestamp: new Date().toISOString(),
      record_count: rows.length
    }
  };
}

async function queryPaginatedDataset({ pool, filters, dateColumn, dimensionColumn = 'source', selectSql, fromSql, orderBy, limit, offset }) {
  const { where, params } = buildWhereClauses(filters, dateColumn, dimensionColumn);

  let query = `${selectSql}\n${fromSql}`;
  if (where.length) {
    query += ` WHERE ${where.join(' AND ')}`;
  }

  query += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const paginatedParams = [...params, limit, offset];

  const [rowsResult, countResult] = await Promise.all([
    pool.query(query, paginatedParams),
    pool.query(
      `SELECT COUNT(*) AS total ${fromSql}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`,
      params
    )
  ]);

  return {
    rows: rowsResult.rows,
    total: parseInt(countResult.rows[0]?.total || 0, 10)
  };
}

async function maybeRefreshMetaRange(filters) {
  void filters;
  return;
}

async function resolveAccountIdsFilter(pool, filters) {
  const selectedAccountId = String(filters?.accountId || '').trim();
  const selectedPlatform = String(filters?.platform || '').trim().toUpperCase();

  if (!selectedAccountId) {
    return [];
  }

  if (isMetaPlatform(selectedPlatform)) {
    return [selectedAccountId];
  }

  if (!isGooglePlatform(selectedPlatform)) {
    return [selectedAccountId];
  }

  try {
    const { rows } = await pool.query(
      `
        WITH RECURSIVE account_tree AS (
          SELECT account_id
          FROM bi.dim_ad_account
          WHERE source = 'GOOGLE' AND account_id = $1
          UNION ALL
          SELECT child.account_id
          FROM bi.dim_ad_account child
          JOIN account_tree parent ON child.parent_account_id = parent.account_id
          WHERE child.source = 'GOOGLE'
        )
        SELECT DISTINCT account_id
        FROM account_tree
      `,
      [selectedAccountId]
    );

    const ids = rows.map((row) => String(row.account_id || '').trim()).filter(Boolean);
    return ids.length ? ids : [selectedAccountId];
  } catch (error) {
    return [selectedAccountId];
  }
}

async function getSiteEvents(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const { limit, offset } = buildPagination(req);
    const campaign = req.query.campaign ? String(req.query.campaign).trim() : null;
    const platform = req.query.platform ? String(req.query.platform).trim().toUpperCase() : req.query.source ? String(req.query.source).trim().toUpperCase() : null;

    let query = `
      SELECT
        id,
        campaign_key,
        campaign_name,
        event_type,
        form_name,
        page_url,
        thank_you_url,
        platform,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer,
        title,
        timestamp
      FROM site_events
    `;

    const params = [];

    if (campaign) {
      query += ` WHERE campaign_name = $${params.length + 1}`;
      params.push(campaign);
    }

    if (platform) {
      query += campaign ? ` AND platform = $${params.length + 1}` : ` WHERE platform = $${params.length + 1}`;
      params.push(platform);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    const countWhere = [];
    const countParams = [];

    if (campaign) {
      countParams.push(campaign);
      countWhere.push(`campaign_name = $${countParams.length}`);
    }

    if (platform) {
      countParams.push(platform);
      countWhere.push(`platform = $${countParams.length}`);
    }

    let countQuery = 'SELECT COUNT(*) as total FROM site_events';
    if (countWhere.length) {
      countQuery += ` WHERE ${countWhere.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total || 0, 10);

    return sendSuccess(res, createPaginatedPayload(rows, total, limit, offset), 200);
  } catch (error) {
    if (error?.code === '42P01') {
      return sendSuccess(res, { data: [] }, 200);
    }

    return next(error);
  }
}

async function getDashboardDaily(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const { limit, offset } = buildPagination(req);
    const filters = buildFilters(req);
    filters.accountIds = await resolveAccountIdsFilter(pool, filters);
    await maybeRefreshMetaRange(filters);
    const dimensionColumn = await getDashboardDimensionColumn(pool, 'v_dashboard_daily');
    const { rows, total } = await queryPaginatedDataset({
      pool,
      filters,
      dateColumn: 'day',
      dimensionColumn,
      selectSql: `
      SELECT
        day,
        month_start,
        ${dimensionColumn} AS source,
        campaign_key,
        campaign_name,
        provider_account_id,
        provider_account_name,
        currency_code,
        spend,
        clicks,
        impressions,
        reach,
        conversions_api,
        conversions_api AS leads_api,
        events_count,
        conversions_web,
        leads_new_count,
        leads_touch_count,
        leads_target,
        lead_share_pct,
        sales_target,
        conversion_rate_target,
        cpc,
        cpl,
        CASE WHEN COALESCE(conversions_api, 0) > 0 THEN ROUND((COALESCE(spend, 0) / NULLIF(conversions_api, 0))::numeric, 4) ELSE NULL END AS cpl_api,
        cpa,
        lead_completion_pct,
        sales_completion_pct
      `,
      fromSql: 'FROM bi.v_dashboard_daily',
      orderBy: `day DESC, ${dimensionColumn} ASC, campaign_name ASC`,
      limit,
      offset
    });

    return sendSuccess(res, createPaginatedPayload(rows, total, limit, offset), 200);
  } catch (error) {
    return next(error);
  }
}

async function getDashboardMonthly(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const { limit, offset } = buildPagination(req);
    const filters = buildFilters(req);
    filters.accountIds = await resolveAccountIdsFilter(pool, filters);
    await maybeRefreshMetaRange(filters);
    const dimensionColumn = await getDashboardDimensionColumn(pool, 'v_dashboard_monthly');
    const { rows, total } = await queryPaginatedDataset({
      pool,
      filters,
      dateColumn: 'month_start',
      dimensionColumn,
      selectSql: `
      SELECT
        month_start,
        ${dimensionColumn} AS source,
        campaign_key,
        campaign_name,
        provider_account_id,
        provider_account_name,
        currency_code,
        spend,
        clicks,
        impressions,
        reach,
        conversions_api,
        conversions_api AS leads_api,
        events_count,
        conversions_web,
        leads_new_count,
        leads_touch_count,
        leads_target,
        lead_share_pct,
        sales_target,
        conversion_rate_target,
        cpc,
        cpl,
        CASE WHEN COALESCE(conversions_api, 0) > 0 THEN ROUND((COALESCE(spend, 0) / NULLIF(conversions_api, 0))::numeric, 4) ELSE NULL END AS cpl_api,
        cpa,
        lead_completion_pct,
        sales_completion_pct
      `,
      fromSql: 'FROM bi.v_dashboard_monthly',
      orderBy: `month_start DESC, ${dimensionColumn} ASC, campaign_name ASC`,
      limit,
      offset
    });

    return sendSuccess(res, createPaginatedPayload(rows, total, limit, offset), 200);
  } catch (error) {
    return next(error);
  }
}

async function getDashboardSummary(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, {}, 200);
    }

    const filters = buildFilters(req);
    filters.accountIds = await resolveAccountIdsFilter(pool, filters);
    await maybeRefreshMetaRange(filters);
    const dimensionColumn = await getDashboardDimensionColumn(pool, 'v_dashboard_daily');
    const { where, params } = buildWhereClauses(filters, 'day', dimensionColumn);

    let query = `
      SELECT
        COALESCE(SUM(spend), 0)::numeric(18,6) AS spend,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(impressions), 0)::bigint AS impressions,
        COALESCE(SUM(reach), 0)::bigint AS reach,
        COALESCE(SUM(conversions_api), 0)::numeric(18,4) AS conversions_api,
        COALESCE(SUM(conversions_api), 0)::numeric(18,4) AS leads_api,
        COALESCE(SUM(events_count), 0)::bigint AS events_count,
        COALESCE(SUM(conversions_web), 0)::bigint AS conversions_web,
        COALESCE(SUM(leads_new_count), 0)::bigint AS leads_new_count,
        COALESCE(SUM(leads_touch_count), 0)::bigint AS leads_touch_count,
        CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(clicks), 0))::numeric, 4) ELSE NULL END AS cpc,
        CASE WHEN SUM(leads_new_count) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(leads_new_count), 0))::numeric, 4) ELSE NULL END AS cpl,
        CASE WHEN SUM(conversions_api) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(conversions_api), 0))::numeric, 4) ELSE NULL END AS cpl_api,
        CASE WHEN SUM(conversions_web) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(conversions_web), 0))::numeric, 4) ELSE NULL END AS cpa,
        CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) * 100, 2) ELSE NULL END AS ctr,
        CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(conversions_api)::numeric / NULLIF(SUM(clicks), 0)) * 100, 2) ELSE NULL END AS conversion_rate_api,
        CASE WHEN SUM(conversions_web) > 0 THEN ROUND((SUM(leads_new_count)::numeric / NULLIF(SUM(conversions_web), 0)) * 100, 2) ELSE NULL END AS lead_to_sales_rate
      FROM bi.v_dashboard_daily
    `;

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    const { rows } = await pool.query(query, params);

    return sendSuccess(res, rows[0] || {}, 200);
  } catch (error) {
    return next(error);
  }
}

async function getDashboardCampaignOptions(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, { data: [] }, 200);
    }

    const platform = req.query.platform ? normalizePlatformFilter(req.query.platform) : '';
    const accountId = req.query.account_id ? String(req.query.account_id).trim() : '';
    const accountIds = await resolveAccountIdsFilter(pool, {
      platform,
      accountId
    });
    const dimensionColumn = await getDashboardDimensionColumn(pool, 'v_dashboard_monthly');

    let query = `
      SELECT DISTINCT campaign_name
      FROM bi.v_dashboard_monthly
      WHERE COALESCE(campaign_name, '') <> ''
    `;

    const params = [];

    const platformWhere = [];
    const platformParams = [];
    appendPlatformFilter({
      where: platformWhere,
      params: platformParams,
      platform,
      dimensionColumn
    });

    if (platformWhere.length) {
      params.push(...platformParams);
      query += ` AND ${platformWhere.join(' AND ')}`;
    }

    if (accountIds.length) {
      if (accountIds.length === 1) {
        params.push(accountIds[0]);
        query += ` AND provider_account_id = $${params.length}`;
      } else {
        params.push(accountIds);
        query += ` AND provider_account_id = ANY($${params.length}::text[])`;
      }
    }

    query += ' ORDER BY campaign_name ASC';

    const { rows } = await pool.query(query, params);

    return sendSuccess(
      res,
      {
        data: rows.map(row => String(row.campaign_name || '').trim()).filter(Boolean)
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

async function getDashboardAccountOptions(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, { data: [] }, 200);
    }

    const platform = req.query.platform ? normalizePlatformFilter(req.query.platform) : 'META';
    const dimensionColumn = await getDashboardDimensionColumn(pool, 'v_dashboard_monthly');

    if (!isMetaPlatform(platform)) {
      return sendSuccess(res, { data: [] }, 200);
    }

    const platformWhere = [];
    const platformParams = [];
    appendPlatformFilter({
      where: platformWhere,
      params: platformParams,
      platform,
      dimensionColumn
    });

    const { rows } = await pool.query(
      `
        SELECT
          provider_account_id,
          COALESCE(MAX(NULLIF(provider_account_name, '')), provider_account_id) AS provider_account_name
        FROM bi.v_dashboard_monthly
        WHERE ${platformWhere.length ? platformWhere.join(' AND ') : '1=1'}
          AND COALESCE(provider_account_id, '') <> ''
        GROUP BY provider_account_id
        ORDER BY provider_account_name ASC, provider_account_id ASC
      `,
      platformParams
    );

    return sendSuccess(
      res,
      {
        data: rows
          .map((row) => ({
            id: String(row.provider_account_id || '').trim(),
            name: String(row.provider_account_name || '').trim() || String(row.provider_account_id || '').trim()
          }))
          .filter((row) => row.id)
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

async function getDashboardAccountTree(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, { data: [] }, 200);
    }

    const requestedPlatform = req.query.platform ? String(req.query.platform).trim().toUpperCase() : '';
    const platform = normalizePlatformFilter(requestedPlatform);

    if (platform !== 'GOOGLE') {
      return sendSuccess(res, { data: [] }, 200);
    }

    const { rows } = await pool.query(
      `
        SELECT
          account_id,
          parent_account_id,
          account_name,
          level,
          is_manager
        FROM bi.dim_ad_account
        WHERE source = 'GOOGLE'
        ORDER BY level ASC, account_name ASC, account_id ASC
      `
    );

    return sendSuccess(
      res,
      {
        data: rows
          .map((row) => ({
            id: String(row.account_id || '').trim(),
            parent_id: String(row.parent_account_id || '').trim() || null,
            name: String(row.account_name || '').trim() || String(row.account_id || '').trim(),
            level: Number(row.level || 0),
            is_manager: Boolean(row.is_manager)
          }))
          .filter((row) => row.id)
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

async function postDashboardRefresh(req, res, next) {
  try {
    const result = await refreshPaidInsights({ trigger: 'manual' });
    return sendSuccess(
      res,
      {
        ...result,
        cooldown_ms: MANUAL_REFRESH_COOLDOWN_MS
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

async function getCampaignKpis(req, res, next) {
  return getDashboardMonthly(req, res, next);
}

module.exports = {
  getSiteEvents,
  getCampaignKpis,
  getDashboardDaily,
  getDashboardMonthly,
  getDashboardSummary,
  getDashboardAccountTree,
  getDashboardAccountOptions,
  getDashboardCampaignOptions,
  postDashboardRefresh
};
