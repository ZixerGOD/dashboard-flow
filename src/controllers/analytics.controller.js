const { getPool } = require('../config/database');
const { sendSuccess } = require('../utils/response');

function parseIntOr(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFilters(req) {
  return {
    campaign: req.query.campaign ? String(req.query.campaign).trim() : null,
    platform: req.query.platform ? String(req.query.platform).trim().toUpperCase() : req.query.source ? String(req.query.source).trim().toUpperCase() : null,
    startDate: req.query.start_date ? String(req.query.start_date).trim() : null,
    endDate: req.query.end_date ? String(req.query.end_date).trim() : null
  };
}

function buildWhereClauses(filters, dateColumn) {
  const where = [];
  const params = [];

  if (filters.campaign) {
    params.push(filters.campaign);
    where.push(`campaign_name = $${params.length}`);
  }

  if (filters.platform) {
    params.push(filters.platform);
    where.push(`source = $${params.length}`);
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

async function getSiteEvents(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const limit = Math.min(parseIntOr(req.query.limit || 10000, 10000), 50000);
    const offset = Math.max(parseIntOr(req.query.offset || 0, 0), 0);
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

    return sendSuccess(
      res,
      {
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
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

async function getDashboardDaily(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const limit = Math.min(parseIntOr(req.query.limit || 10000, 10000), 50000);
    const offset = Math.max(parseIntOr(req.query.offset || 0, 0), 0);
    const filters = buildFilters(req);
    const { where, params } = buildWhereClauses(filters, 'day');

    let query = `
      SELECT
        day,
        month_start,
        source,
        campaign_key,
        campaign_name,
        currency_code,
        spend,
        clicks,
        impressions,
        reach,
        conversions_api,
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
        cpa,
        lead_completion_pct,
        sales_completion_pct
      FROM bi.v_dashboard_daily
    `;

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY day DESC, source ASC, campaign_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM bi.v_dashboard_daily';
    const countParams = params.slice(0, params.length - 2);

    if (where.length) {
      countQuery += ` WHERE ${where.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return sendSuccess(
      res,
      {
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
      },
      200
    );
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

    const limit = Math.min(parseIntOr(req.query.limit || 10000, 10000), 50000);
    const offset = Math.max(parseIntOr(req.query.offset || 0, 0), 0);
    const filters = buildFilters(req);
    const { where, params } = buildWhereClauses(filters, 'month_start');

    let query = `
      SELECT
        month_start,
        source,
        campaign_key,
        campaign_name,
        currency_code,
        spend,
        clicks,
        impressions,
        reach,
        conversions_api,
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
        cpa,
        lead_completion_pct,
        sales_completion_pct
      FROM bi.v_dashboard_monthly
    `;

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY month_start DESC, source ASC, campaign_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM bi.v_dashboard_monthly';
    const countParams = params.slice(0, params.length - 2);

    if (where.length) {
      countQuery += ` WHERE ${where.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return sendSuccess(
      res,
      {
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
      },
      200
    );
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
    const { where, params } = buildWhereClauses(filters, 'day');

    let query = `
      SELECT
        COALESCE(SUM(spend), 0)::numeric(18,6) AS spend,
        COALESCE(SUM(clicks), 0)::bigint AS clicks,
        COALESCE(SUM(impressions), 0)::bigint AS impressions,
        COALESCE(SUM(reach), 0)::bigint AS reach,
        COALESCE(SUM(conversions_api), 0)::numeric(18,4) AS conversions_api,
        COALESCE(SUM(events_count), 0)::bigint AS events_count,
        COALESCE(SUM(conversions_web), 0)::bigint AS conversions_web,
        COALESCE(SUM(leads_new_count), 0)::bigint AS leads_new_count,
        COALESCE(SUM(leads_touch_count), 0)::bigint AS leads_touch_count,
        CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(clicks), 0))::numeric, 4) ELSE NULL END AS cpc,
        CASE WHEN SUM(leads_new_count) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(leads_new_count), 0))::numeric, 4) ELSE NULL END AS cpl,
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

    const platform = req.query.platform ? String(req.query.platform).trim().toUpperCase() : '';

    let query = `
      SELECT DISTINCT campaign_name
      FROM bi.v_dashboard_monthly
      WHERE COALESCE(campaign_name, '') <> ''
    `;

    const params = [];

    if (platform) {
      params.push(platform);
      query += ` AND source = $${params.length}`;
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

async function getCampaignKpis(req, res, next) {
  return getDashboardMonthly(req, res, next);
}

module.exports = {
  getSiteEvents,
  getCampaignKpis,
  getDashboardDaily,
  getDashboardMonthly,
  getDashboardSummary,
  getDashboardCampaignOptions
};