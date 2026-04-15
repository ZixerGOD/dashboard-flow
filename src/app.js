const express = require('express');
const healthRoutes = require('./routes/health.routes');
const insightsRoutes = require('./routes/insights.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const widgetsRoutes = require('./routes/widgets.routes');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const { env } = require('./config/env');

function rawBodySaver(req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf;
  }
}

function parseAllowedOrigins(originsValue) {
  if (!originsValue || originsValue === '*') {
    return ['*'];
  }

  return originsValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function createCorsMiddleware() {
  const allowedOrigins = parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
  const allowAnyOrigin = allowedOrigins.includes('*');

  return function corsMiddleware(req, res, next) {
    const origin = req.get('origin');
    const isAllowedOrigin = allowAnyOrigin || (origin && allowedOrigins.includes(origin));

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowAnyOrigin ? '*' : origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Token, X-Make-Token, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  };
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: '1mb', verify: rawBodySaver }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/health', healthRoutes);
  app.use('/ingest/insights', insightsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/widgets', widgetsRoutes);

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'uees-insights-middleware' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp();