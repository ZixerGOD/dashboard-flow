const path = require('path');
const { sendSuccess, createHttpError } = require('../utils/response');
const insightsService = require('../services/insights.service');
const crmRepository = require('../repositories/crm.repository');
const logger = require('../config/logger');

const leadScriptPath = path.resolve(__dirname, '../widgets/lead.js');

function normalizePlatform(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function serveLeadScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
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
      platform: normalizePlatform(body.platform || body.source || 'web'),
      event_type: body.event_type || 'widget_lead_form',
      form_name: body.form_name || 'embedded-lead-widget'
    };

    if (!payload.campaign_name) {
      payload.campaign_name = payload.programa || payload.title || 'Lead Widget';
    }

    const result = await insightsService.processInsightsPayload(payload);

    let crmForwarding = {
      ok: false,
      skipped: false,
      error: null
    };

    try {
      const crmResult = await crmRepository.submitLead(payload);
      crmForwarding = {
        ok: !crmResult?.skipped,
        skipped: Boolean(crmResult?.skipped),
        status_code: crmResult?.status_code || null,
        error: null,
        response: crmResult?.response ?? null
      };
    } catch (crmError) {
      crmForwarding = {
        ok: false,
        skipped: false,
        status_code: crmError?.status_code || crmError?.response?.status || null,
        error: crmError?.message || 'crm_forward_failed',
        response: crmError?.response_data ?? crmError?.response?.data ?? null
      };

      logger.error({ err: crmError }, 'Failed forwarding widget lead to CRM endpoint');
    }

    return sendSuccess(
      res,
      {
        ...result,
        crm_forwarding: crmForwarding
      },
      200
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  serveLeadScript,
  submitLead
};
