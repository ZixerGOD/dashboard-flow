const path = require('path');
const { sendSuccess, createHttpError } = require('../utils/response');
const insightsService = require('../services/insights.service');
const crmRepository = require('../repositories/crm.repository');
const logger = require('../config/logger');

const leadScriptPath = path.resolve(__dirname, '../widgets/lead.js');

function normalizePlatform(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function cleanText(value) {
  return String(value == null ? '' : value).trim();
}

function applyWidgetDefaultUtm(payload) {
  const hasAnyUtm = Boolean(
    cleanText(payload.utm_source) ||
    cleanText(payload.utm_medium) ||
    cleanText(payload.utm_campaign) ||
    cleanText(payload.utm_content) ||
    cleanText(payload.utm_term) ||
    cleanText(payload.utm_id)
  );

  if (!hasAnyUtm) {
    payload.utm_source = 'FORM_WEB';
    payload.utm_medium = 'TRAFICO';
    payload.utm_campaign = 'UEES_GRADO_EC';
    payload.utm_content = 'CAMP_LANDINGS_ABR26';
    payload.utm_term = 'ORGANICO';
  }

  if (!cleanText(payload.utm_id)) {
    payload.utm_id = String(payload.form_name || '').toUpperCase() === 'FORM_WS' ? 'BTN_FORM_WS' : 'BTN_FORM_WEB';
  }
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

    applyWidgetDefaultUtm(payload);

    const result = await insightsService.processInsightsPayload(payload);

    let crmForwarding = {
      ok: false,
      skipped: false,
      error: null
    };

    try {
      const crmResult = await crmRepository.submitLead(payload);
      const requestPayload = crmResult?.request_payload || {};
      crmForwarding = {
        ok: !crmResult?.skipped,
        skipped: Boolean(crmResult?.skipped),
        status_code: crmResult?.status_code || null,
        error: null,
        response: crmResult?.response ?? null,
        request: {
          programa: requestPayload.programa || '',
          procedencia: requestPayload.procedencia || '',
          utm_source: requestPayload.utm_source || '',
          utm_medium: requestPayload.utm_medium || '',
          utm_campaign: requestPayload.utm_campaign || '',
          utm_content: requestPayload.utm_content || '',
          utm_term: requestPayload.utm_term || '',
          utm_id: requestPayload.utm_id || ''
        }
      };
    } catch (crmError) {
      const requestPayload = crmError?.request_payload || {};
      crmForwarding = {
        ok: false,
        skipped: false,
        status_code: crmError?.status_code || crmError?.response?.status || null,
        error: crmError?.message || 'crm_forward_failed',
        response: crmError?.response_data ?? crmError?.response?.data ?? null,
        request: {
          programa: requestPayload.programa || '',
          procedencia: requestPayload.procedencia || '',
          utm_source: requestPayload.utm_source || '',
          utm_medium: requestPayload.utm_medium || '',
          utm_campaign: requestPayload.utm_campaign || '',
          utm_content: requestPayload.utm_content || '',
          utm_term: requestPayload.utm_term || '',
          utm_id: requestPayload.utm_id || ''
        }
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
