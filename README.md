# UEES Insights Middleware

## Purpose

Middleware for Make.com insights ingestion plus CRM matching for dashboard analytics.

## Current Project Context (Apr 2026)

Use this section as context when asking another AI to generate UI/UX prompts or implementation plans.

### Stack and runtime

- Single Node.js package using CommonJS + Express.
- Main runtime entry: `src/server.js`; app wiring in `src/app.js`.
- Prisma is used for schema/migrations/studio, but runtime analytics queries are mostly raw SQL via `src/repositories/*.repository.js`.
- Dashboard HTML/CSS/JS is server-rendered inline from `src/controllers/dashboard.controller.js`.

### Dashboard behavior and constraints

- Dashboard/API routes are protected with cookie auth (`requireDashboardAuth`).
- Analytics filters are DB-first (no live API call for every filter interaction).
- Manual refresh is available in UI; scheduled sync remains the source for regular updates.
- Platform behavior:
  - `META` includes FB + IG semantics.
  - Legacy rows with `platform='META'` are still considered where needed.

### Current dashboard UI state

- Visual direction is minimalist, clean, and high-contrast, with soft white cards and neutral background.
- Global shell is visually wide; main content is centered in a focus lane at approximately 80% viewport width.
- Inside the focus lane:
  - Filters card
  - Summary metric cards
  - Monthly summary accordion (open by default)
  - Daily summary accordion (open by default)
- Monthly and daily sections include nested campaign accordions.
- Campaign accordion headers show campaign name only (no spend/records text in closed state).
- Current palette direction keeps the existing project colors (brand burgundy + warm accents), while layout follows a cleaner editorial style.

### Future UI module (planned)

- Add `Actionable Insights` as a dedicated section above summaries.
- Each insight should include: issue, likely cause, suggested action, and priority/impact.

### Visual reference notes

- A strong external style reference image is being used outside this repo.
- Goal for future iterations: keep the same clean line and visual hierarchy shown in that reference while preserving current dashboard data flows and filters.

## Setup

1. Copy `.env.example` to `.env` and fill the required values.
2. Install dependencies with `npm install`.
3. Start the service with `npm run start` or `npm run dev`.

## Webhook Endpoints

- `POST /ingest/insights` for Make.com insights.
- `GET /health` for health checks.

For WordPress thank-you page events, you can also post to `POST /ingest/insights` and include `skip_crm_match: true` so the middleware stores only anonymous page/form metadata.

## Database

The matcher expects a `contacts` table with at least these columns:

- `cedula`
- `full_name`
- `email`
- `phone`

## Make.com payload

Send `POST` requests to `/ingest/insights`.

Recommended headers:

- `Content-Type: application/json`
- `X-Webhook-Token: TU_TOKEN` or `Authorization: Bearer TU_TOKEN`

Example payload with one row:

```json
{
	"rows": [
		{
			"campaign_name": "GradoOnline",
			"adset_name": "Ecuador - Prospecting",
			"country": "Ecuador",
			"date_start": "2026-03-01",
			"date_stop": "2026-03-31",
			"spend": 75,
			"clicks": 24,
			"cpc": 3.12,
			"impressions": 1540,
			"reach": 1200,
			"conversions": 3,
			"campaign_id": "1202...",
			"adset_id": "1203...",
			"account_id": "act_123456789"
		}
	]
}
```

You can also send a single object instead of `rows`, and the API will wrap it automatically.

Required field in each row:

- `campaign_name`

Optional but recommended:

- `campaign_id`
- `adset_name`
- `adset_id`
- `country`
- `date_start`
- `date_stop`
- `spend`
- `clicks`
- `cpc`
- `impressions`
- `reach`
- `conversions`

If you configure `MAKE_WEBHOOK_TOKEN`, the endpoint will require one of these headers:

- `X-Webhook-Token`
- `X-Make-Token`
- `Authorization: Bearer ...`

## WordPress PHP snippet

Use this in a small plugin, Code Snippets, or your theme `functions.php`. It fires on a thank-you page and sends only anonymous metadata.

```php
<?php

add_action('template_redirect', function () {
	if (is_admin() || wp_doing_ajax()) {
		return;
	}

	$thank_you_pages = array('gracias', 'thank-you');

	if (!is_page($thank_you_pages)) {
		return;
	}

	$endpoint = 'https://webservices.devmaniacs.net/ingest/insights';
	$token = 'TU_MAKE_WEBHOOK_TOKEN';

	$current_url = home_url(add_query_arg(array(), $GLOBALS['wp']->request));
	$referrer = isset($_SERVER['HTTP_REFERER']) ? esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER'])) : '';

	$utm_keys = array('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term');
	$utm = array();

	foreach ($utm_keys as $key) {
		$utm[$key] = isset($_GET[$key]) ? sanitize_text_field(wp_unslash($_GET[$key])) : '';
	}

	$payload = array(
		'campaign_name' => get_the_title(),
		'event_type' => 'wordpress_thank_you',
		'source' => 'wordpress',
		'skip_crm_match' => true,
		'form_name' => 'wordpress-thank-you',
		'page_url' => $current_url,
		'thank_you_url' => $current_url,
		'referrer' => $referrer,
		'title' => wp_get_document_title(),
		'timestamp' => gmdate('c'),
	) + $utm;

	wp_remote_post($endpoint, array(
		'timeout' => 10,
		'headers' => array(
			'Content-Type' => 'application/json',
			'X-Webhook-Token' => $token,
		),
		'body' => wp_json_encode($payload),
	));
});
```

Change these values before using it:

- `TU_MAKE_WEBHOOK_TOKEN` to your shared webhook token
- `gracias` and `thank-you` to the actual thank-you page slugs

Recommended payload fields for WordPress events:

- `campaign_name` as the page or form label
- `event_type` = `wordpress_thank_you`
- `source` = `wordpress`
- `skip_crm_match` = `true`
- `page_url`, `referrer`, and UTM fields

## Prisma Studio

Use Prisma Studio to inspect the database visually:

```bash
npm run prisma:generate
npm run prisma:studio
```

Studio opens on port `5555` by default. You can change it with `PRISMA_STUDIO_PORT`.

## Embeddable Widgets (Phase 3)

This project now exposes a reusable widget script so external sites can load forms without copying HTML/CSS/JS blocks.

Script endpoint:

```html
<script src="https://webservices.devmaniacs.net/widgets/lead.js"></script>
```

The widget injects the form into the DOM right after the script tag, captures UTM parameters from the current page URL, and submits to:

- `POST /widgets/lead/submit`

Default variant (full form):

```html
<script
	src="https://webservices.devmaniacs.net/widgets/lead.js"
	data-programa="Derecho de Empresa"
></script>
```

WhatsApp variant:

```html
<script
	src="https://webservices.devmaniacs.net/widgets/lead.js"
	data-variant="wa"
	data-programa="Derecho de Empresa"
	data-whatsapp="593980068660"
></script>
```

Supported `data-*` attributes:

- `data-variant`: `full` (default) or `wa`
- `data-programa`: value sent as `programa` and fallback `campaign_name`
- `data-title`: widget heading text
- `data-source`: custom source label in payload
- `data-submit-url`: override submission endpoint (optional)
- `data-base-url`: base URL for default `data-submit-url` resolution
- `data-whatsapp`: destination number for the `wa` variant
- `data-success-message`: custom success text

## PM2

Start with PM2:

```bash
npx -y pm2 start ecosystem.config.js --only dashboard-flow --update-env
```

Useful commands:

```bash
npx -y pm2 ls
npx -y pm2 logs dashboard-flow --lines 100
npx -y pm2 restart dashboard-flow --update-env
```

## NGINX

Create this file in the server (outside this project):

- `/etc/nginx/sites-available/webservices.devmaniacs.net`

```nginx
server {
	listen 80;
	listen [::]:80;
	server_name webservices.devmaniacs.net;

	client_max_body_size 10m;

	location /.well-known/acme-challenge/ {
		root /var/www/html;
	}

	location / {
		proxy_pass http://127.0.0.1:4000;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
		proxy_set_header X-Forwarded-Host $host;
		proxy_set_header X-Forwarded-Port $server_port;
	}
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/webservices.devmaniacs.net /etc/nginx/sites-enabled/webservices.devmaniacs.net
sudo nginx -t
sudo systemctl reload nginx
```
