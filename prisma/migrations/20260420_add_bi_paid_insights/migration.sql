CREATE TABLE IF NOT EXISTS bi.fact_paid_campaign_daily (
  day date NOT NULL,
  source varchar(20) NOT NULL,
  campaign_key varchar(255) NOT NULL,
  campaign_name varchar(255) NOT NULL,
  currency_code varchar(8),
  spend numeric(18,6) NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  reach bigint NOT NULL DEFAULT 0,
  conversions numeric(18,4) NOT NULL DEFAULT 0,
  provider_campaign_id varchar(64),
  provider_account_id varchar(64),
  raw_payload jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, source, campaign_key)
);

CREATE INDEX IF NOT EXISTS idx_fact_paid_campaign_daily_day ON bi.fact_paid_campaign_daily(day);
CREATE INDEX IF NOT EXISTS idx_fact_paid_campaign_daily_source ON bi.fact_paid_campaign_daily(source);
CREATE INDEX IF NOT EXISTS idx_fact_paid_campaign_daily_campaign_key ON bi.fact_paid_campaign_daily(campaign_key);

CREATE TABLE IF NOT EXISTS bi.monthly_targets (
  year smallint NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  month_name varchar(20) NOT NULL,
  leads_target integer NOT NULL,
  lead_share_pct numeric(5,2) NOT NULL,
  sales_target integer NOT NULL,
  conversion_rate_target numeric(5,2) NOT NULL,
  PRIMARY KEY (year, month)
);

INSERT INTO bi.monthly_targets (
  year,
  month,
  month_name,
  leads_target,
  lead_share_pct,
  sales_target,
  conversion_rate_target
) VALUES
  (2026, 1, 'enero', 3837, 7.40, 338, 9.00),
  (2026, 2, 'febrero', 3888, 7.50, 452, 12.00),
  (2026, 3, 'marzo', 5247, 10.20, 521, 10.00),
  (2026, 4, 'abril', 5227, 10.10, 361, 7.00),
  (2026, 5, 'mayo', 5586, 10.80, 565, 10.00),
  (2026, 6, 'junio', 4648, 9.00, 342, 7.00),
  (2026, 7, 'julio', 4103, 7.90, 478, 12.00),
  (2026, 8, 'agosto', 4477, 8.70, 368, 8.00),
  (2026, 9, 'septiembre', 4250, 8.20, 469, 11.00),
  (2026, 10, 'octubre', 4563, 8.80, 378, 8.00),
  (2026, 11, 'noviembre', 3056, 5.90, 274, 9.00),
  (2026, 12, 'diciembre', 2751, 5.30, 314, 11.00)
ON CONFLICT (year, month)
DO UPDATE SET
  month_name = EXCLUDED.month_name,
  leads_target = EXCLUDED.leads_target,
  lead_share_pct = EXCLUDED.lead_share_pct,
  sales_target = EXCLUDED.sales_target,
  conversion_rate_target = EXCLUDED.conversion_rate_target;

DROP VIEW IF EXISTS bi.v_dashboard_monthly;
DROP VIEW IF EXISTS bi.v_dashboard_daily;
DROP VIEW IF EXISTS bi.v_campaign_marketing_funnel;
DROP VIEW IF EXISTS bi.v_campaign_kpis;

CREATE VIEW bi.v_dashboard_daily AS
WITH paid AS (
  SELECT
    day,
    UPPER(COALESCE(source, '')) AS source,
    campaign_key,
    campaign_name,
    currency_code,
    spend,
    clicks,
    impressions,
    reach,
    conversions AS conversions_api,
    provider_campaign_id,
    provider_account_id
  FROM bi.fact_paid_campaign_daily
),
leads AS (
  SELECT
    f.day,
    UPPER(COALESCE(c.source, '')) AS source,
    c.campaign_key,
    c.campaign_name,
    SUM(f.events_count)::bigint AS events_count,
    SUM(f.conversions_count)::bigint AS conversions_web,
    SUM(f.leads_new_count)::bigint AS leads_new_count,
    SUM(f.leads_touch_count)::bigint AS leads_touch_count
  FROM bi.fact_campaign_daily f
  JOIN bi.dim_campaign c ON c.campaign_id = f.campaign_id
  GROUP BY f.day, UPPER(COALESCE(c.source, '')), c.campaign_key, c.campaign_name
)
SELECT
  COALESCE(p.day, l.day) AS day,
  DATE_TRUNC('month', COALESCE(p.day, l.day))::date AS month_start,
  UPPER(COALESCE(NULLIF(p.source, ''), NULLIF(l.source, ''), '')) AS source,
  COALESCE(NULLIF(p.campaign_key, ''), NULLIF(l.campaign_key, '')) AS campaign_key,
  COALESCE(NULLIF(p.campaign_name, ''), NULLIF(l.campaign_name, '')) AS campaign_name,
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
 AND mt.month = EXTRACT(MONTH FROM COALESCE(p.day, l.day))::smallint;

CREATE VIEW bi.v_dashboard_monthly AS
SELECT
  DATE_TRUNC('month', day)::date AS month_start,
  source,
  campaign_key,
  campaign_name,
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
GROUP BY DATE_TRUNC('month', day)::date, source, campaign_key, campaign_name, currency_code;
