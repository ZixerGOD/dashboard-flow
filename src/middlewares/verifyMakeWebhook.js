const { env } = require('../config/env');
const { createHttpError } = require('../utils/response');

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
    return next();
  }

  const headerToken = req.get('x-webhook-token') || req.get('x-make-token') || getBearerToken(req.get('authorization'));

  if (!headerToken || headerToken !== env.MAKE_WEBHOOK_TOKEN) {
    return next(createHttpError(401, 'Invalid Make webhook token'));
  }

  return next();
}

module.exports = verifyMakeWebhook;