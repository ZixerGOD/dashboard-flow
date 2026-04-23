const { getPool } = require('../config/database');

function toDateOnly(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function isTruthyEventType(eventType) {
  const normalized = String(eventType || '').toLowerCase();
  return normalized.includes('conversion') || normalized.includes('thank_you') || normalized.includes('lead') || normalized.includes('submit') || normalized.includes('web');
}

const MONTHLY_TARGETS_2026 = [
  { month: 1, month_name: 'enero', leads_target: 3837, lead_share_pct: 7.4, sales_target: 338, conversion_rate_target: 9 },
  { month: 2, month_name: 'febrero', leads_target: 3888, lead_share_pct: 7.5, sales_target: 452, conversion_rate_target: 12 },
  { month: 3, month_name: 'marzo', leads_target: 5247, lead_share_pct: 10.2, sales_target: 521, conversion_rate_target: 10 },
  { month: 4, month_name: 'abril', leads_target: 5227, lead_share_pct: 10.1, sales_target: 361, conversion_rate_target: 7 },
  { month: 5, month_name: 'mayo', leads_target: 5586, lead_share_pct: 10.8, sales_target: 565, conversion_rate_target: 10 },
  { month: 6, month_name: 'junio', leads_target: 4648, lead_share_pct: 9, sales_target: 342, conversion_rate_target: 7 },
  { month: 7, month_name: 'julio', leads_target: 4103, lead_share_pct: 7.9, sales_target: 478, conversion_rate_target: 12 },
  { month: 8, month_name: 'agosto', leads_target: 4477, lead_share_pct: 8.7, sales_target: 368, conversion_rate_target: 8 },
  { month: 9, month_name: 'septiembre', leads_target: 4250, lead_share_pct: 8.2, sales_target: 469, conversion_rate_target: 11 },
  { month: 10, month_name: 'octubre', leads_target: 4563, lead_share_pct: 8.8, sales_target: 378, conversion_rate_target: 8 },
  { month: 11, month_name: 'noviembre', leads_target: 3056, lead_share_pct: 5.9, sales_target: 274, conversion_rate_target: 9 },
  { month: 12, month_name: 'diciembre', leads_target: 2751, lead_share_pct: 5.3, sales_target: 314, conversion_rate_target: 11 }
];

async function ensureMonthlyTargets(client) {
  await client.query(
    `
      CREATE TABLE IF NOT EXISTS bi.monthly_targets (
        year smallint NOT NULL,
        month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
        month_name varchar(20) NOT NULL,
        leads_target integer NOT NULL,
        lead_share_pct numeric(5,2) NOT NULL,
        sales_target integer NOT NULL,
        conversion_rate_target numeric(5,2) NOT NULL,
        PRIMARY KEY (year, month)
      )
    `
  );

  for (const target of MONTHLY_TARGETS_2026) {
    await client.query(
      `
        INSERT INTO bi.monthly_targets (
          year,
          month,
          month_name,
          leads_target,
          lead_share_pct,
          sales_target,
          conversion_rate_target
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (year, month)
        DO UPDATE SET
          month_name = EXCLUDED.month_name,
          leads_target = EXCLUDED.leads_target,
          lead_share_pct = EXCLUDED.lead_share_pct,
          sales_target = EXCLUDED.sales_target,
          conversion_rate_target = EXCLUDED.conversion_rate_target
      `,
      [2026, target.month, target.month_name, target.leads_target, target.lead_share_pct, target.sales_target, target.conversion_rate_target]
    );
  }
}

async function ensureDashboardViews(client) {
  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ADD COLUMN IF NOT EXISTS platform varchar(20)');
  await client.query(`UPDATE bi.fact_paid_campaign_daily SET platform = COALESCE(NULLIF(platform, ''), source) WHERE platform IS NULL OR platform = ''`);

  await client.query('ALTER TABLE bi.fact_paid_campaign_daily ADD COLUMN IF NOT EXISTS provider_account_name varchar(255)');

  await client.query('DROP VIEW IF EXISTS bi.v_dashboard_monthly');
  await client.query('DROP VIEW IF EXISTS bi.v_dashboard_daily');
  await client.query('DROP VIEW IF EXISTS bi.v_campaign_marketing_funnel');
  await client.query('DROP VIEW IF EXISTS bi.v_campaign_kpis');

  await client.query(
    `
      CREATE VIEW bi.v_dashboard_daily AS
      WITH paid AS (
        SELECT
          day,
          UPPER(COALESCE(source, '')) AS source,
          UPPER(COALESCE(platform, source, '')) AS platform,
          campaign_key,
          campaign_name,
          currency_code,
          spend,
          clicks,
          impressions,
          reach,
          conversions AS conversions_api,
          provider_campaign_id,
          provider_account_id,
          provider_account_name
        FROM bi.fact_paid_campaign_daily
      ),
      leads AS (
        SELECT
          f.day,
          UPPER(COALESCE(c.source, '')) AS source,
          UPPER(COALESCE(c.source, '')) AS platform,
          c.campaign_key,
          c.campaign_name,
          SUM(f.events_count)::bigint AS events_count,
          SUM(f.conversions_count)::bigint AS conversions_web,
          SUM(f.leads_new_count)::bigint AS leads_new_count,
          SUM(f.leads_touch_count)::bigint AS leads_touch_count
        FROM bi.fact_campaign_daily f
        JOIN bi.dim_campaign c ON c.campaign_id = f.campaign_id
        GROUP BY f.day, UPPER(COALESCE(c.source, '')), UPPER(COALESCE(c.source, '')), c.campaign_key, c.campaign_name
      )
      SELECT
        COALESCE(p.day, l.day) AS day,
        DATE_TRUNC('month', COALESCE(p.day, l.day))::date AS month_start,
        UPPER(COALESCE(NULLIF(p.source, ''), NULLIF(l.source, ''), '')) AS source,
        UPPER(COALESCE(NULLIF(p.platform, ''), NULLIF(l.platform, ''), NULLIF(p.source, ''), NULLIF(l.source, ''), '')) AS platform,
        COALESCE(NULLIF(p.campaign_key, ''), NULLIF(l.campaign_key, '')) AS campaign_key,
        COALESCE(NULLIF(p.campaign_name, ''), NULLIF(l.campaign_name, '')) AS campaign_name,
        COALESCE(p.provider_account_id, '') AS provider_account_id,
        COALESCE(p.provider_account_name, '') AS provider_account_name,
        COALESCE(p.currency_code, '') AS currency_code,
        COALESCE(p.spend, 0::numeric) AS spend,
        COALESCE(p.clicks, 0::bigint) AS clicks,
        COALESCE(p.impressions, 0::bigint) AS impressions,
        COALESCE(p.reach, 0::bigint) AS reach,
        COALESCE(p.conversions_api, 0::numeric) AS conversions_api,
        COALESCE(l.events_count, 0::bigint) AS events_count,
        COALESCE(l.conversions_web, 0::bigint) AS conversions_web,
        COALESCE(l.leads_new_count, 0::bigint) AS leads_new_count,
        COALESCE(l.leads_touch_count, 0::bigint) AS leads_touch_count,
        COALESCE(mt.leads_target, 0)::bigint AS leads_target,
        COALESCE(mt.lead_share_pct, 0::numeric) AS lead_share_pct,
        COALESCE(mt.sales_target, 0)::bigint AS sales_target,
        COALESCE(mt.conversion_rate_target, 0::numeric) AS conversion_rate_target,
        CASE WHEN COALESCE(p.clicks, 0) > 0 THEN ROUND((COALESCE(p.spend, 0) / NULLIF(p.clicks, 0))::numeric, 4) ELSE NULL END AS cpc,
        CASE WHEN COALESCE(l.leads_new_count, 0) > 0 THEN ROUND((COALESCE(p.spend, 0) / NULLIF(l.leads_new_count, 0))::numeric, 4) ELSE NULL END AS cpl,
        CASE WHEN COALESCE(l.conversions_web, 0) > 0 THEN ROUND((COALESCE(p.spend, 0) / NULLIF(l.conversions_web, 0))::numeric, 4) ELSE NULL END AS cpa,
        CASE WHEN COALESCE(mt.leads_target, 0) > 0 THEN ROUND((COALESCE(l.leads_new_count, 0)::numeric / NULLIF(mt.leads_target, 0)) * 100, 2) ELSE NULL END AS lead_completion_pct,
        CASE WHEN COALESCE(mt.sales_target, 0) > 0 THEN ROUND((COALESCE(l.conversions_web, 0)::numeric / NULLIF(mt.sales_target, 0)) * 100, 2) ELSE NULL END AS sales_completion_pct
      FROM paid p
      FULL OUTER JOIN leads l
        ON p.day = l.day
       AND UPPER(COALESCE(p.source, '')) = UPPER(COALESCE(l.source, ''))
       AND p.campaign_key = l.campaign_key
      LEFT JOIN bi.monthly_targets mt
        ON mt.year = EXTRACT(YEAR FROM COALESCE(p.day, l.day))::smallint
       AND mt.month = EXTRACT(MONTH FROM COALESCE(p.day, l.day))::smallint
    `
  );

  await client.query(
    `
      CREATE VIEW bi.v_dashboard_monthly AS
      SELECT
        DATE_TRUNC('month', day)::date AS month_start,
        source,
        platform,
        campaign_key,
        campaign_name,
        provider_account_id,
        provider_account_name,
        currency_code,
        SUM(spend)::numeric(18,6) AS spend,
        SUM(clicks)::bigint AS clicks,
        SUM(impressions)::bigint AS impressions,
        SUM(reach)::bigint AS reach,
        SUM(conversions_api)::numeric(18,4) AS conversions_api,
        SUM(events_count)::bigint AS events_count,
        SUM(conversions_web)::bigint AS conversions_web,
        SUM(leads_new_count)::bigint AS leads_new_count,
        SUM(leads_touch_count)::bigint AS leads_touch_count,
        MAX(leads_target)::bigint AS leads_target,
        MAX(lead_share_pct)::numeric(5,2) AS lead_share_pct,
        MAX(sales_target)::bigint AS sales_target,
        MAX(conversion_rate_target)::numeric(5,2) AS conversion_rate_target,
        CASE WHEN SUM(clicks) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(clicks), 0))::numeric, 4) ELSE NULL END AS cpc,
        CASE WHEN SUM(leads_new_count) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(leads_new_count), 0))::numeric, 4) ELSE NULL END AS cpl,
        CASE WHEN SUM(conversions_web) > 0 THEN ROUND((SUM(spend) / NULLIF(SUM(conversions_web), 0))::numeric, 4) ELSE NULL END AS cpa,
        CASE WHEN MAX(leads_target) > 0 THEN ROUND((SUM(leads_new_count)::numeric / NULLIF(MAX(leads_target), 0)) * 100, 2) ELSE NULL END AS lead_completion_pct,
        CASE WHEN MAX(sales_target) > 0 THEN ROUND((SUM(conversions_web)::numeric / NULLIF(MAX(sales_target), 0)) * 100, 2) ELSE NULL END AS sales_completion_pct
      FROM bi.v_dashboard_daily
      GROUP BY DATE_TRUNC('month', day)::date, source, platform, campaign_key, campaign_name, provider_account_id, provider_account_name, currency_code
    `
  );
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

async function upsertLeadCampaignBridge(client, contactId, leadCode, campaignId, eventTimestamp) {
  if (!campaignId || !leadCode) {
    return false;
  }

  const insertResult = await client.query(
    `
      INSERT INTO bi.bridge_lead_campaign (
        contact_id,
        lead_code,
        campaign_id,
        first_event_at,
        last_event_at,
        touch_count
      ) VALUES ($1,$2,$3,$4,$4,1)
      ON CONFLICT (lead_code, campaign_id) DO NOTHING
      RETURNING lead_code
    `,
    [contactId || null, leadCode, campaignId, eventTimestamp]
  );

  if (insertResult.rowCount > 0) {
    return true;
  }

  await client.query(
    `
      UPDATE bi.bridge_lead_campaign
      SET
        contact_id = COALESCE($1, contact_id),
        last_event_at = $3,
        touch_count = touch_count + 1
      WHERE lead_code = $4 AND campaign_id = $2
    `,
    [contactId || null, campaignId, eventTimestamp, leadCode]
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

async function recordSiteEventMetrics({ siteEvent, contactId, leadCode }) {
  const pool = getPool();

  if (!pool || !siteEvent?.campaign_key || !siteEvent?.campaign_name) {
    return null;
  }

  const eventTimestamp = siteEvent.timestamp ? new Date(siteEvent.timestamp) : new Date();
  const safeEventTimestamp = Number.isNaN(eventTimestamp.getTime()) ? new Date() : eventTimestamp;

  const campaignPayload = {
    campaign_key: String(siteEvent.campaign_key).trim(),
    campaign_name: String(siteEvent.campaign_name).trim(),
    source: siteEvent.platform || null,
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
    const isNewLeadCampaign = await upsertLeadCampaignBridge(client, contactId, leadCode, campaignId, safeEventTimestamp);

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
      bridge_upserted: 0,
      facts_upserted: 0
    };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureMonthlyTargets(client);

    const campaignsResult = await client.query(
      `
        WITH events AS (
          SELECT
            s.id,
            s.campaign_key,
            s.campaign_name,
            s.platform,
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
            e.platform
          FROM events e
          WHERE COALESCE(TRIM(e.platform), '') <> ''
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
          ls.platform,
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

    const bridgeCleanupResult = await client.query(
      `
        DELETE FROM bi.bridge_lead_campaign blc
        WHERE NOT EXISTS (
          SELECT 1
          FROM lead_event_matches lem
          JOIN site_events se ON se.id = lem.site_event_id
          JOIN bi.dim_campaign dc ON dc.campaign_key = se.campaign_key
          WHERE COALESCE(TRIM(lem.lead_code), '') <> ''
            AND COALESCE(TRIM(se.campaign_key), '') <> ''
            AND lem.lead_code = blc.lead_code
            AND dc.campaign_id = blc.campaign_id
        )
      `
    );

    const bridgeResult = await client.query(
      `
        INSERT INTO bi.bridge_lead_campaign (
          contact_id,
          lead_code,
          campaign_id,
          first_event_at,
          last_event_at,
          touch_count
        )
        SELECT
          lem.contact_id,
          lem.lead_code,
          dc.campaign_id,
          MIN(se.timestamp) AS first_event_at,
          MAX(se.timestamp) AS last_event_at,
          COUNT(*)::integer AS touch_count
        FROM lead_event_matches lem
        JOIN site_events se ON se.id = lem.site_event_id
        JOIN bi.dim_campaign dc ON dc.campaign_key = se.campaign_key
        WHERE COALESCE(TRIM(lem.lead_code), '') <> ''
          AND COALESCE(TRIM(se.campaign_key), '') <> ''
        GROUP BY lem.contact_id, lem.lead_code, dc.campaign_id
        ON CONFLICT (lead_code, campaign_id)
        DO UPDATE SET
          contact_id = COALESCE(EXCLUDED.contact_id, bi.bridge_lead_campaign.contact_id),
          first_event_at = LEAST(bi.bridge_lead_campaign.first_event_at, EXCLUDED.first_event_at),
          last_event_at = GREATEST(bi.bridge_lead_campaign.last_event_at, EXCLUDED.last_event_at),
          touch_count = EXCLUDED.touch_count
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
          COALESCE(lead_counts.leads_new_count, 0)::bigint AS leads_new_count,
          COALESCE(lead_counts.leads_touch_count, 0)::bigint AS leads_touch_count
        FROM site_events s
        JOIN bi.dim_campaign c ON c.campaign_key = s.campaign_key
        LEFT JOIN (
          WITH first_lead_day AS (
            SELECT
              lem.lead_code,
              MIN(DATE(se.timestamp)) AS first_day
            FROM lead_event_matches lem
            JOIN site_events se ON se.id = lem.site_event_id
            WHERE COALESCE(TRIM(lem.lead_code), '') <> ''
            GROUP BY lem.lead_code
          )
          SELECT
            DATE(se.timestamp) AS day,
            dc.campaign_id,
            COUNT(DISTINCT lem.lead_code)::bigint AS leads_touch_count,
            COUNT(DISTINCT CASE WHEN fld.first_day = DATE(se.timestamp) THEN lem.lead_code END)::bigint AS leads_new_count
          FROM lead_event_matches lem
          JOIN site_events se ON se.id = lem.site_event_id
          JOIN bi.dim_campaign dc ON dc.campaign_key = se.campaign_key
          LEFT JOIN first_lead_day fld ON fld.lead_code = lem.lead_code
          WHERE COALESCE(TRIM(se.campaign_key), '') <> ''
            AND COALESCE(TRIM(lem.lead_code), '') <> ''
          GROUP BY DATE(se.timestamp), dc.campaign_id
        ) lead_counts ON lead_counts.day = DATE(s.timestamp) AND lead_counts.campaign_id = c.campaign_id
        WHERE COALESCE(TRIM(s.campaign_key), '') <> ''
        GROUP BY DATE(s.timestamp), c.campaign_id, lead_counts.leads_new_count, lead_counts.leads_touch_count
        ON CONFLICT (day, campaign_id)
        DO UPDATE SET
          events_count = EXCLUDED.events_count,
          conversions_count = EXCLUDED.conversions_count,
          leads_new_count = EXCLUDED.leads_new_count,
          leads_touch_count = EXCLUDED.leads_touch_count
      `
    );

    await ensureDashboardViews(client);

    await client.query('COMMIT');

    return {
      campaigns_upserted: campaignsResult.rowCount,
      bridge_deleted: bridgeCleanupResult.rowCount,
      bridge_upserted: bridgeResult.rowCount,
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
