const path = require('path');
const { sendSuccess, createHttpError } = require('../utils/response');
const insightsService = require('../services/insights.service');

const leadScriptPath = path.resolve(__dirname, '../widgets/lead.js');

function serveLeadScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.sendFile(leadScriptPath);
}

async function submitLead(req, res, next) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (body.website) {
      return next(createHttpError(400, 'Invalid payload'));
    }

    const payload = {
      ...body,
      skip_crm_match: true,
      source: body.source || 'web',
      event_type: body.event_type || 'widget_lead_form',
      form_name: body.form_name || 'embedded-lead-widget'
    };

    if (!payload.campaign_name) {
      payload.campaign_name = payload.programa || payload.title || 'Lead Widget';
    }

    const result = await insightsService.processInsightsPayload(payload);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  serveLeadScript,
  submitLead
};
