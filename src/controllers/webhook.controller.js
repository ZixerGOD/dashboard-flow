const { env } = require('../config/env');
const { sendSuccess } = require('../utils/response');
const leadService = require('../services/lead.service');

function verifySubscription(req, res, next) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return next(Object.assign(new Error('Invalid webhook verification token'), { statusCode: 403 }));
}

async function handleLeadWebhook(req, res, next) {
  try {
    const result = await leadService.processWebhook(req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  verifySubscription,
  handleLeadWebhook
};