# AGENTS

## Fast facts
- Single-package Node.js service (`type: commonjs`), main entrypoint `src/server.js`.
- App wiring is in `src/app.js`; routes/controllers/services/repositories are all plain JS under `src/`.
- No test/lint/typecheck setup in repo. The only built-in verification command is `npm run build` (syntax check with `node --check` across all `.js` files).

## Setup and run
- Install: `npm install`
- Dev server (watch mode): `npm run dev`
- Production-style run: `npm run start`
- Prisma Studio: `npm run prisma:generate && npm run prisma:studio`

## High-value operational commands
- Rebuild BI derived tables/views manually: `npm run bi:reconcile`
- Sync paid insights (supports `--start_date=YYYY-MM-DD`, `--end_date=YYYY-MM-DD`, or `--days=N`):
  - `npm run insights:sync:meta -- --days=30`
  - `npm run insights:sync:google -- --days=30`
- TikTok sync script exists but is a stub (`status: not_implemented`): `npm run insights:sync:tiktok -- --days=30`

## Runtime behavior that is easy to miss
- `src/server.js` runs BI reconciliation at startup when DB is configured, then starts a daily paid-insights scheduler.
- Scheduler timing is local server time (`setHours`) at `09:00`, not UTC.
- Manual refresh endpoint is `POST /api/analytics/dashboard/refresh`; cooldown is 5 minutes (`MANUAL_REFRESH_COOLDOWN_MS`).
- `DATABASE_URL` is optional in code: if missing, no pool is created and many DB-backed handlers return empty payloads/fallbacks instead of crashing.

## Auth and security constraints
- Dashboard/API auth depends on `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD`, `DASHBOARD_AUTH_SECRET`.
  - Missing values cause dashboard/auth-protected API routes to return `503` (not open access).
- Ingest token middleware (`src/middlewares/verifyMakeWebhook.js`):
  - If `MAKE_WEBHOOK_TOKEN` is unset in production, `/ingest/insights` returns `503`.
  - In non-production, ingest is allowed without token.
- Google Ads OAuth routes are behind dashboard auth and require `APP_PUBLIC_URL` + Google OAuth env vars.

## Data layer boundaries
- Prisma is present for schema/studio, but runtime analytics and BI logic are mostly raw SQL via `pg` repositories.
- `prisma/schema.prisma` models only app tables (`contacts`, `site_events`, `lead_event_matches`); BI schema/view definitions are created/updated in `src/repositories/bi_metrics.repository.js` and paid-insights repository code.

## Editing guidance for this repo
- Dashboard UI is generated inline in `src/controllers/dashboard.controller.js` (large HTML/CSS/JS template string), not in separate frontend files.
- Embeddable widget scripts are served directly from `src/widgets/lead.js` and `src/widgets/lead-stepper.js` via `/widgets/*.js` routes.
- Rate limiting is in-memory (`Map`) per process in `src/middlewares/rateLimit.js`; behavior is not shared across instances.
