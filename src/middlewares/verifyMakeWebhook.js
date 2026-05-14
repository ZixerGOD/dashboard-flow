const { env } = require('../config/env');
const { createHttpError } = require('../utils/response');
const crypto = require('crypto');

function getBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return '';
  }

  if (!headerValue.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return headerValue.slice(7).trim();
}

function verifyMakeWebhook(req, res, next) {
  if (!env.MAKE_WEBHOOK_TOKEN) {
    return next(createHttpError(404, 'Insights ingest endpoint is disabled'));
  }

  const headerToken = req.get('x-webhook-token') || req.get('x-make-token') || getBearerToken(req.get('authorization'));

  const incoming = Buffer.from(String(headerToken || ''));
  const expected = Buffer.from(String(env.MAKE_WEBHOOK_TOKEN || ''));
  const isValid = incoming.length === expected.length && crypto.timingSafeEqual(incoming, expected);

  if (!isValid) {
    return next(createHttpError(401, 'Invalid Make webhook token'));
  }

  return next();
}

module.exports = verifyMakeWebhook;
