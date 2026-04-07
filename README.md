# Meta Lead Ads to inConcert Middleware

## Setup

1. Copy `.env.example` to `.env` and fill the required values.
2. Install dependencies with `npm install`.
3. Start the service with `npm run start` or `npm run dev`.

## Webhook Endpoints

- `GET /webhooks/meta` for Meta verification.
- `POST /webhooks/meta` for lead events.
- `GET /health` for health checks.

## Database

The matcher expects a `contacts` table with at least these columns:

- `cedula`
- `full_name`
- `email`
- `phone`

## Docker

Build the image with:

```bash
docker build -t dashboard-flow .
```

Run it with:

```bash
docker run -p 3000:3000 --env-file .env dashboard-flow
```

## Docker Compose (API + PostgreSQL)

Use this when you want the API and database in separate containers:

```bash
docker compose up -d --build
```

The compose file creates:

- `dashboard-flow-api`
- `dashboard-flow-postgres`

The initial table is created from `docker/postgres/init/001_contacts.sql` on first boot.

## Environment Settings (Dockploy)

Set these in Dockploy:

- `META_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN`
- `INCONCERT_BASE_URL`
- `INCONCERT_ENDPOINT` (example: `/api/leads`)
- `INCONCERT_TOKEN` (if applies)
- `INCONCERT_API_KEY` (if applies)
- `POSTGRES_DB` (example: `dashboard_flow`)
- `POSTGRES_USER` (example: `dashboard_flow`)
- `POSTGRES_PASSWORD` (strong password)

Optional but recommended:

- `LOG_LEVEL=info`
- `REQUEST_TIMEOUT_MS=10000`
- `DATABASE_POOL_MAX=10`

Notes:

- Do not set `DATABASE_URL` manually in Dockploy when using `docker-compose.yml`; it is constructed internally to point to the `postgres` service.
- The Dockerfile cannot create a second container. For API + DB, use `docker-compose.yml`.