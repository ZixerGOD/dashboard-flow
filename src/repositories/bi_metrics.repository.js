const { getPool } = require('../config/database');

function toDateOnly(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function isTruthyEventType(eventType) {
  const normalized = String(eventType || '').toLowerCase();
  return normalized.includes('conversion') || normalized.includes('thank_you') || normalized.includes('lead') || normalized.includes('submit');
}

async function upsertCampaign(client, payload) {
  const result = await client.query(
    `
      INSERT INTO bi.dim_campaign (
        campaign_key,
        campaign_name,
        source,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        first_seen_at,
        last_seen_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
      ON CONFLICT (campaign_key)
      DO UPDATE SET
        campaign_name = EXCLUDED.campaign_name,
        source = COALESCE(NULLIF(EXCLUDED.source, ''), bi.dim_campaign.source),
        referrer = COALESCE(NULLIF(EXCLUDED.referrer, ''), bi.dim_campaign.referrer),
        utm_source = COALESCE(NULLIF(EXCLUDED.utm_source, ''), bi.dim_campaign.utm_source),
        utm_medium = COALESCE(NULLIF(EXCLUDED.utm_medium, ''), bi.dim_campaign.utm_medium),
        utm_campaign = COALESCE(NULLIF(EXCLUDED.utm_campaign, ''), bi.dim_campaign.utm_campaign),
        utm_content = COALESCE(NULLIF(EXCLUDED.utm_content, ''), bi.dim_campaign.utm_content),
        utm_term = COALESCE(NULLIF(EXCLUDED.utm_term, ''), bi.dim_campaign.utm_term),
        last_seen_at = GREATEST(bi.dim_campaign.last_seen_at, EXCLUDED.last_seen_at)
      RETURNING campaign_id
    `,
    [
      payload.campaign_key,
      payload.campaign_name,
      payload.source || null,
      payload.referrer || null,
      payload.utm_source || null,
      payload.utm_medium || null,
      payload.utm_campaign || null,
      payload.utm_content || null,
      payload.utm_term || null,
      payload.event_timestamp
    ]
  );

  return result.rows[0]?.campaign_id || null;
}

async function upsertLeadCampaignBridge(client, contactId, campaignId, eventTimestamp) {
  if (!contactId || !campaignId) {
    return false;
  }

  const insertResult = await client.query(
    `
      INSERT INTO bi.bridge_lead_campaign (
        contact_id,
        campaign_id,
        first_event_at,
        last_event_at,
        touch_count
      ) VALUES ($1,$2,$3,$3,1)
      ON CONFLICT (contact_id, campaign_id) DO NOTHING
      RETURNING contact_id
    `,
    [contactId, campaignId, eventTimestamp]
  );

  if (insertResult.rowCount > 0) {
    return true;
  }

  await client.query(
    `
      UPDATE bi.bridge_lead_campaign
      SET
        last_event_at = $3,
        touch_count = touch_count + 1
      WHERE contact_id = $1 AND campaign_id = $2
    `,
    [contactId, campaignId, eventTimestamp]
  );

  return false;
}

async function upsertDailyFact(client, payload) {
  await client.query(
    `
      INSERT INTO bi.fact_campaign_daily (
        day,
        campaign_id,
        events_count,
        conversions_count,
        leads_new_count,
        leads_touch_count
      ) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (day, campaign_id)
      DO UPDATE SET
        events_count = bi.fact_campaign_daily.events_count + EXCLUDED.events_count,
        conversions_count = bi.fact_campaign_daily.conversions_count + EXCLUDED.conversions_count,
        leads_new_count = bi.fact_campaign_daily.leads_new_count + EXCLUDED.leads_new_count,
        leads_touch_count = bi.fact_campaign_daily.leads_touch_count + EXCLUDED.leads_touch_count
    `,
    [
      payload.day,
      payload.campaign_id,
      payload.events_count,
      payload.conversions_count,
      payload.leads_new_count,
      payload.leads_touch_count
    ]
  );
}

async function recordSiteEventMetrics({ siteEvent, contactId }) {
  const pool = getPool();

  if (!pool || !siteEvent?.campaign_key || !siteEvent?.campaign_name) {
    return null;
  }

  const eventTimestamp = siteEvent.timestamp ? new Date(siteEvent.timestamp) : new Date();
  const safeEventTimestamp = Number.isNaN(eventTimestamp.getTime()) ? new Date() : eventTimestamp;

  const campaignPayload = {
    campaign_key: String(siteEvent.campaign_key).trim(),
    campaign_name: String(siteEvent.campaign_name).trim(),
    source: siteEvent.source || null,
    referrer: siteEvent.metadata?.referrer || null,
    utm_source: siteEvent.metadata?.utm_source || null,
    utm_medium: siteEvent.metadata?.utm_medium || null,
    utm_campaign: siteEvent.metadata?.utm_campaign || null,
    utm_content: siteEvent.metadata?.utm_content || null,
    utm_term: siteEvent.metadata?.utm_term || null,
    event_timestamp: safeEventTimestamp
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const campaignId = await upsertCampaign(client, campaignPayload);
    const isNewLeadCampaign = await upsertLeadCampaignBridge(client, contactId, campaignId, safeEventTimestamp);

    await upsertDailyFact(client, {
      day: toDateOnly(safeEventTimestamp),
      campaign_id: campaignId,
      events_count: 1,
      conversions_count: isTruthyEventType(siteEvent.event_type) ? 1 : 0,
      leads_new_count: isNewLeadCampaign ? 1 : 0,
      leads_touch_count: contactId ? 1 : 0
    });

    await client.query('COMMIT');
    return { campaign_id: campaignId, is_new_lead_campaign: isNewLeadCampaign };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function reconcileBiFromPublic() {
  const pool = getPool();

  if (!pool) {
    return {
      campaigns_upserted: 0,
      facts_upserted: 0
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const campaignsResult = await client.query(
      `
        WITH events AS (
          SELECT
            s.id,
            s.campaign_key,
            s.campaign_name,
            s.source,
            s.referrer,
            s.utm_source,
            s.utm_medium,
            s.utm_campaign,
            s.utm_content,
            s.utm_term,
            s.timestamp
          FROM site_events s
          WHERE COALESCE(TRIM(s.campaign_key), '') <> ''
            AND COALESCE(TRIM(s.campaign_name), '') <> ''
        ),
        agg AS (
          SELECT
            e.campaign_key,
            MIN(e.timestamp) AS first_seen_at,
            MAX(e.timestamp) AS last_seen_at
          FROM events e
          GROUP BY e.campaign_key
        ),
        latest_name AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.campaign_name
          FROM events e
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_utm_source AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.utm_source
          FROM events e
          WHERE COALESCE(TRIM(e.utm_source), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_utm_medium AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.utm_medium
          FROM events e
          WHERE COALESCE(TRIM(e.utm_medium), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_utm_campaign AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.utm_campaign
          FROM events e
          WHERE COALESCE(TRIM(e.utm_campaign), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_utm_content AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.utm_content
          FROM events e
          WHERE COALESCE(TRIM(e.utm_content), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_utm_term AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.utm_term
          FROM events e
          WHERE COALESCE(TRIM(e.utm_term), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_source AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.source
          FROM events e
          WHERE COALESCE(TRIM(e.source), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        ),
        latest_referrer AS (
          SELECT DISTINCT ON (e.campaign_key)
            e.campaign_key,
            e.referrer
          FROM events e
          WHERE COALESCE(TRIM(e.referrer), '') <> ''
          ORDER BY e.campaign_key, e.timestamp DESC, e.id DESC
        )
        INSERT INTO bi.dim_campaign (
          campaign_key,
          campaign_name,
          source,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          first_seen_at,
          last_seen_at
        )
        SELECT
          a.campaign_key,
          ln.campaign_name,
          ls.source,
          lr.referrer,
          lus.utm_source,
          lum.utm_medium,
          luc.utm_campaign,
          luct.utm_content,
          lut.utm_term,
          a.first_seen_at,
          a.last_seen_at
        FROM agg a
        JOIN latest_name ln ON ln.campaign_key = a.campaign_key
        LEFT JOIN latest_utm_source lus ON lus.campaign_key = a.campaign_key
        LEFT JOIN latest_utm_medium lum ON lum.campaign_key = a.campaign_key
        LEFT JOIN latest_utm_campaign luc ON luc.campaign_key = a.campaign_key
        LEFT JOIN latest_utm_content luct ON luct.campaign_key = a.campaign_key
        LEFT JOIN latest_utm_term lut ON lut.campaign_key = a.campaign_key
        LEFT JOIN latest_source ls ON ls.campaign_key = a.campaign_key
        LEFT JOIN latest_referrer lr ON lr.campaign_key = a.campaign_key
        ON CONFLICT (campaign_key)
        DO UPDATE SET
          campaign_name = EXCLUDED.campaign_name,
          source = COALESCE(NULLIF(EXCLUDED.source, ''), bi.dim_campaign.source),
          referrer = COALESCE(NULLIF(EXCLUDED.referrer, ''), bi.dim_campaign.referrer),
          utm_source = COALESCE(NULLIF(EXCLUDED.utm_source, ''), bi.dim_campaign.utm_source),
          utm_medium = COALESCE(NULLIF(EXCLUDED.utm_medium, ''), bi.dim_campaign.utm_medium),
          utm_campaign = COALESCE(NULLIF(EXCLUDED.utm_campaign, ''), bi.dim_campaign.utm_campaign),
          utm_content = COALESCE(NULLIF(EXCLUDED.utm_content, ''), bi.dim_campaign.utm_content),
          utm_term = COALESCE(NULLIF(EXCLUDED.utm_term, ''), bi.dim_campaign.utm_term),
          first_seen_at = LEAST(bi.dim_campaign.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(bi.dim_campaign.last_seen_at, EXCLUDED.last_seen_at)
      `
    );

    const factsResult = await client.query(
      `
        INSERT INTO bi.fact_campaign_daily (
          day,
          campaign_id,
          events_count,
          conversions_count,
          leads_new_count,
          leads_touch_count
        )
        SELECT
          DATE(s.timestamp) AS day,
          c.campaign_id,
          COUNT(*)::bigint AS events_count,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(s.event_type, '')) LIKE '%conversion%'
               OR LOWER(COALESCE(s.event_type, '')) LIKE '%thank_you%'
               OR LOWER(COALESCE(s.event_type, '')) LIKE '%lead%'
               OR LOWER(COALESCE(s.event_type, '')) LIKE '%submit%'
          )::bigint AS conversions_count,
          COUNT(*)::bigint AS leads_new_count,
          COUNT(*)::bigint AS leads_touch_count
        FROM site_events s
        JOIN bi.dim_campaign c ON c.campaign_key = s.campaign_key
        WHERE COALESCE(TRIM(s.campaign_key), '') <> ''
        GROUP BY DATE(s.timestamp), c.campaign_id
        ON CONFLICT (day, campaign_id)
        DO UPDATE SET
          events_count = EXCLUDED.events_count,
          conversions_count = EXCLUDED.conversions_count,
          leads_new_count = EXCLUDED.leads_new_count,
          leads_touch_count = EXCLUDED.leads_touch_count
      `
    );

    await client.query('DROP VIEW IF EXISTS bi.v_campaign_kpis');
    await client.query(
      `
        CREATE VIEW bi.v_campaign_kpis AS
        SELECT
          f.day,
          c.campaign_key,
          c.campaign_name,
          COALESCE(c.utm_source, '') AS utm_source,
          COALESCE(c.utm_medium, '') AS utm_medium,
          COALESCE(c.utm_campaign, '') AS utm_campaign,
          COALESCE(c.utm_content, '') AS utm_content,
          COALESCE(c.utm_term, '') AS utm_term,
          f.events_count,
          f.conversions_count,
          f.leads_new_count,
          f.leads_touch_count,
          COALESCE(c.referrer, '') AS referrer,
          COALESCE(c.source, '') AS source
        FROM bi.fact_campaign_daily f
        JOIN bi.dim_campaign c ON c.campaign_id = f.campaign_id
      `
    );
    await client.query('GRANT SELECT ON bi.v_campaign_kpis TO looker_ro');

    await client.query('COMMIT');

    return {
      campaigns_upserted: campaignsResult.rowCount,
      facts_upserted: factsResult.rowCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  recordSiteEventMetrics,
  reconcileBiFromPublic
};