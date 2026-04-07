const express = require('express');
const healthRoutes = require('./routes/health.routes');
const webhookRoutes = require('./routes/webhook.routes');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');

function rawBodySaver(req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf;
  }
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb', verify: rawBodySaver }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/health', healthRoutes);
  app.use('/webhooks/meta', webhookRoutes);

  app.get('/', (req, res) => {
    res.json({ ok: true, service: 'meta-leads-inconcert' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = createApp();