const { getPool } = require('../config/database');
const { sendSuccess } = require('../utils/response');

async function getSiteEvents(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const limit = Math.min(parseInt(req.query.limit || 10000), 50000);
    const offset = Math.max(parseInt(req.query.offset || 0), 0);
    const campaign = req.query.campaign ? String(req.query.campaign).trim() : null;

    let query = `
      SELECT 
        id,
        campaign_key,
        campaign_name,
        event_type,
        form_name,
        page_url,
        thank_you_url,
        source,
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

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    const countQuery = campaign
      ? `SELECT COUNT(*) as total FROM site_events WHERE campaign_name = $1`
      : `SELECT COUNT(*) as total FROM site_events`;

    const countParams = campaign ? [campaign] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total || 0);

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

async function getCampaignKpis(req, res, next) {
  try {
    const pool = getPool();

    if (!pool) {
      return sendSuccess(res, [], 200);
    }

    const limit = Math.min(parseInt(req.query.limit || 10000, 10), 50000);
    const offset = Math.max(parseInt(req.query.offset || 0, 10), 0);
    const campaign = req.query.campaign ? String(req.query.campaign).trim() : null;
    const source = req.query.source ? String(req.query.source).trim().toLowerCase() : null;
    const utmSource = req.query.utm_source ? String(req.query.utm_source).trim() : null;
    const utmMedium = req.query.utm_medium ? String(req.query.utm_medium).trim() : null;
    const startDate = req.query.start_date ? String(req.query.start_date).trim() : null;
    const endDate = req.query.end_date ? String(req.query.end_date).trim() : null;

    let query = `
      SELECT
        day,
        campaign_key,
        campaign_name,
        source,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        events_count,
        conversions_count,
        leads_new_count,
        leads_touch_count
      FROM bi.v_campaign_kpis
    `;

    const where = [];
    const params = [];

    if (campaign) {
      params.push(campaign);
      where.push(`campaign_name = $${params.length}`);
    }

    if (source) {
      params.push(source);
      where.push(`source = $${params.length}`);
    }

    if (utmSource) {
      params.push(utmSource);
      where.push(`utm_source = $${params.length}`);
    }

    if (utmMedium) {
      params.push(utmMedium);
      where.push(`utm_medium = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      where.push(`day >= $${params.length}::date`);
    }

    if (endDate) {
      params.push(endDate);
      where.push(`day <= $${params.length}::date`);
    }

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY day DESC, campaign_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM bi.v_campaign_kpis';
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

module.exports = {
  getSiteEvents,
  getCampaignKpis
};
