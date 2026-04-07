# Meta Lead Ads to inConcert Middleware

## Setup

1. Copy `.env.example` to `.env` and fill the required values.
2. Install dependencies with `npm install`.
3. Start the service with `npm run start` or `npm run dev`.

## Webhook Endpoints


## Database

The matcher expects a `contacts` table with at least these columns:


## NGINX

## Docker

Build the image with:

```bash
docker build -t dashboard-flow .
```

Run it with:

```bash
docker run -p 3000:3000 --env-file .env dashboard-flow
```

For Dockploy, point the app to this repository and use the Dockerfile at the project root.