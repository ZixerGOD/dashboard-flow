# Dashboard Flow (UEES Insights Middleware)

Node.js service for:
- lead/widget ingestion (`FORM_WEB`, `FORM_WS`),
- CRM forwarding,
- Meta CAPI forwarding,
- BI reconciliation on PostgreSQL,
- authenticated analytics dashboard.

This README is written to replicate this project on another server with the same behavior, using the same `.env` values.

## 1) Stack and architecture

- Runtime: Node.js (CommonJS), Express
- Entry point: `src/server.js`
- App wiring: `src/app.js`
- DB access in runtime: `pg` + raw SQL repositories (`src/repositories/*.repository.js`)
- Prisma is present for schema/migrations/studio only (`prisma/`)
- Dashboard UI is server-rendered inline from `src/controllers/dashboard.controller.js`

Main layers:
- `src/routes/*`
- `src/controllers/*`
- `src/services/*`
- `src/repositories/*`

## 2) What this service does

### Ingestion and lead flow
- `POST /ingest/insights`: receives rows/events, stores site events, upserts contacts, links lead-event matches, updates BI facts.
- `GET /ingest/insights/track/conversion`: tracking pixel endpoint for conversion capture.

### Widget flow
- Serves widget scripts from `/widgets/*`.
- Receives widget submits in `POST /widgets/lead/submit`.
- For each submit:
  - validates payload,
  - stores event/contact,
  - forwards to CRM (`src/repositories/crm.repository.js`),
  - optionally forwards to Meta CAPI (`src/services/metaCapi.service.js`).

### Dashboard and analytics
- Login-protected dashboard at `/dashboard`.
- API under `/api/analytics/*` protected by cookie auth.
- Uses BI views for daily/monthly/summary and filters.
- Manual refresh endpoint: `POST /api/analytics/dashboard/refresh`.

### Paid insights sync
- Meta sync service: `src/services/metaInsightsSync.service.js`
- Google Ads sync service: `src/services/googleAdsInsightsSync.service.js`
- Scheduler starts with server and runs daily at 09:00 server local time.

## 3) Prerequisites on target server

- Linux server
- Node.js 20+ (recommended)
- npm
- PostgreSQL 14+
- PM2 (recommended for production)

Install PM2 globally if needed:

```bash
npm install -g pm2
```

## 4) Project setup

Clone and install:

```bash
git clone <your-repo-url> /var/www/dashboard-flow
cd /var/www/dashboard-flow
npm install
```

Environment:
- Copy your existing `.env` from this server to the new server at:
  - `/var/www/dashboard-flow/.env`
- This project will use that exact config.

## 5) Database dump included in repo

This repository includes a SQL dump at:
- `database/dashboard_flow.sql`

### Restore on new server

Example:

```bash
sudo -u postgres psql -c "CREATE USER dashboard_flow WITH PASSWORD 'CHANGE_ME';"
sudo -u postgres psql -c "CREATE DATABASE dashboard_flow OWNER dashboard_flow;"
psql "postgresql://dashboard_flow:CHANGE_ME@127.0.0.1:5432/dashboard_flow" < database/dashboard_flow.sql
```

After restore, ensure `.env` has matching `DATABASE_URL`.

## 6) Build and run

### Validate source

```bash
npm run build
```

`npm run build` runs syntax checks (`node --check`) across JS files.

### Development mode

```bash
npm run dev
```

### Production (foreground)

```bash
npm run start
```

### Production with PM2 (recommended)

```bash
pm2 start ecosystem.config.js
pm2 save
```

If `.env` changes:

```bash
pm2 restart dashboard-flow --update-env
```

## 7) One-command bring-up (after `.env` exists)

From repo root:

```bash
npm install && npm run build && pm2 start ecosystem.config.js --update-env
```

## 8) Key routes

### Health
- `GET /health`

### Dashboard auth and pages
- `GET /login`
- `POST /login`
- `GET /logout`
- `GET /dashboard`

### Analytics API (auth required)
- `GET /api/analytics/dashboard/summary`
- `GET /api/analytics/dashboard/daily`
- `GET /api/analytics/dashboard/monthly`
- `GET /api/analytics/dashboard/account-options`
- `GET /api/analytics/dashboard/campaign-options`
- `GET /api/analytics/dashboard/account-tree`
- `POST /api/analytics/dashboard/refresh`

### Ingestion
- `POST /ingest/insights`
- `GET /ingest/insights/track/conversion`

### Widgets
- `GET /widgets/lead.js`
- `GET /widgets/lead-stepper.js`
- `GET /widgets/lead-stepper-general.js`
- `GET /widgets/lead-stepper-general-grado.js`
- `GET /widgets/lead-stepper-general-postgrado.js`
- `GET /widgets/lead/challenge`
- `POST /widgets/lead/submit`

## 9) Dashboard auth variables (required)

Dashboard/API auth depends on:
- `DASHBOARD_USERNAME`
- `DASHBOARD_PASSWORD`
- `DASHBOARD_AUTH_SECRET`

If missing, dashboard-protected endpoints return `503`.

## 10) Required integration variables

### Core
- `PORT`
- `DATABASE_URL`

### CRM forwarding
- `CRM_BASE_URL`
- `CRM_LEAD_POST_ENDPOINT`
- `CRM_LEAD_POST_ENABLED`

### Widget security
- `WIDGET_CHALLENGE_SECRET` (preferred)
- `WIDGET_CHALLENGE_TTL_SECONDS`
- or `WIDGET_SUBMIT_TOKEN`

### Ingest webhook security
- `MAKE_WEBHOOK_TOKEN`

### Meta sync / CAPI
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID` or `META_AD_ACCOUNT_IDS`
- `META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`

### Google Ads sync
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID`

If Meta/Google vars are missing, manual refresh endpoint will fail with `502` for those platforms.

## 11) Operational scripts

- `npm run bi:reconcile` -> rebuilds BI derived tables/views
- `npm run insights:sync:meta -- --days=30`
- `npm run insights:sync:google -- --days=30`
- `npm run insights:sync:tiktok -- --days=30` (stub/not implemented)
- `npm run cleanup:test-leads` -> removes contacts/events containing `test`/`prueba`

## 12) Runtime behavior notes

- `src/server.js`:
  - verifies DB connectivity,
  - runs BI reconciliation at startup,
  - starts daily paid insights refresh scheduler.
- Scheduler runs at 09:00 local server time.
- If `DATABASE_URL` is absent, pool is not created and DB-backed endpoints return fallback payloads.

## 13) Troubleshooting

### Dashboard refresh button fails
- Check PM2 logs:

```bash
pm2 logs dashboard-flow --lines 200
```

- Typical cause: missing Meta/Google Ads env vars.

### Widget loads on one network but not another
- Usually DNS/cache propagation issue.
- Use cache-busting query version in script URL (for example `?v=20260508-1`).

### 401/503 in dashboard APIs
- Ensure dashboard auth env vars are present and correct.

### Ingest disabled
- If `MAKE_WEBHOOK_TOKEN` is empty, `/ingest/insights` is disabled by middleware.

## 14) Production checklist

- `.env` copied from source server
- PostgreSQL restored from `database/dashboard_flow.sql`
- `npm install` completed
- `npm run build` passes
- PM2 process online (`pm2 list`)
- `/health` returns `ok: true`
- `/dashboard` login works
- Widget scripts return HTTP 200
- Manual dashboard refresh tested
