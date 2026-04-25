const path = require('path');
const { sendSuccess, createHttpError } = require('../utils/response');
const insightsService = require('../services/insights.service');
const crmRepository = require('../repositories/crm.repository');
const logger = require('../config/logger');

const leadScriptPath = path.resolve(__dirname, '../widgets/lead.js');
const leadStepperScriptPath = path.resolve(__dirname, '../widgets/lead-stepper.js');

function normalizePlatform(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function cleanText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeCountryKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function toIsoCountryCode(value) {
  const key = normalizeCountryKey(value);
  const aliasMap = {
    ECUADOR: 'EC',
    PERU: 'PE',
    COLOMBIA: 'CO',
    ESTADOS_UNIDOS: 'US',
    MEXICO: 'MX',
    ITALIA: 'IT',
    FRANCIA: 'FR',
    ESPANA: 'ES',
    SPAIN: 'ES',
    USA: 'US',
    UNITED_STATES: 'US'
  };

  if (aliasMap[key]) {
    return aliasMap[key];
  }

  if (/^[A-Z]{2}$/.test(key)) {
    return key;
  }

  return key;
}

function getIdLengthRulesByCountry() {
  return {
    EC: 10,
    PE: 8,
    CO: 10,
    US: 9,
    MX: 13,
    IT: 11,
    FR: 15,
    ES: 8
  };
}

function applyWidgetDefaultUtm(payload) {
  const defaultUtmSource = 'FORM_WEB';

  const hasAnyUtm = Boolean(
    cleanText(payload.utm_source) ||
    cleanText(payload.utm_medium) ||
    cleanText(payload.utm_campaign) ||
    cleanText(payload.utm_content) ||
    cleanText(payload.utm_term) ||
    cleanText(payload.utm_id)
  );

  if (!hasAnyUtm) {
    payload.utm_source = defaultUtmSource;
    payload.utm_medium = 'TRAFICO';
    payload.utm_campaign = 'UEES_GRADO_EC';
    payload.utm_content = 'CAMP_LANDINGS_ABR26';
    payload.utm_term = 'ORGANICO';
  }

  if (!cleanText(payload.utm_id)) {
    payload.utm_id = 'BTN_FORM_WEB';
  }
}

function serveLeadScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  return res.sendFile(leadScriptPath);
}

function serveLeadStepperScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  return res.sendFile(leadStepperScriptPath);
}

function serveLeadBackupScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  return res.sendFile(leadScriptPath);
}

function validateCountryPhoneMatch(body) {
  const country = cleanText(body.pais || body.country || '');
  const countryCode = cleanText(body.codigo_pais || body.country_code || '');
  const phoneRaw = cleanText(body.celular || body.phone || body.telefono || '');

  if (!country || !countryCode || !phoneRaw) {
    return;
  }

  const normalizedCode = countryCode.replace(/\D/g, '');
  const normalizedPhone = phoneRaw.replace(/\D/g, '');
  const isInternationalPhone = phoneRaw.startsWith('+') || phoneRaw.startsWith('00');

  if (!normalizedCode || !normalizedPhone) {
    return;
  }

  if (isInternationalPhone && !normalizedPhone.startsWith(normalizedCode)) {
    throw createHttpError(400, 'El número de teléfono no coincide con el país seleccionado.');
  }
}

function normalizePhoneWithCountryCode(body) {
  const countryCode = cleanText(body.codigo_pais || body.country_code || '');
  const phoneRaw = cleanText(body.celular || body.phone || body.telefono || '');

  if (!countryCode || !phoneRaw) {
    return;
  }

  const codeDigits = countryCode.replace(/\D/g, '');
  const phoneDigits = phoneRaw.replace(/\D/g, '');

  if (!codeDigits || !phoneDigits) {
    return;
  }

  const isInternationalPhone = phoneRaw.startsWith('+') || phoneRaw.startsWith('00');
  const normalized = isInternationalPhone
    ? `+${phoneDigits}`
    : `+${codeDigits}${phoneDigits}`;

  body.celular = normalized;
  body.phone = normalized;
}

function validateIdentificationDocument(body) {
  const country = toIsoCountryCode(body.pais || body.country || '');
  const idRaw = cleanText(body.cedula || body.documento_identificacion || '');

  if (!country || !idRaw) {
    return;
  }

  const digits = idRaw.replace(/\D/g, '');
  if (digits !== idRaw) {
    throw createHttpError(400, 'El documento de identificación solo acepta números.');
  }

  const expectedLength = getIdLengthRulesByCountry()[country];
  if (expectedLength && digits.length !== expectedLength) {
    throw createHttpError(
      400,
      `El documento de identificación para ${cleanText(body.pais || body.country)} debe tener ${expectedLength} dígitos.`
    );
  }
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

    normalizePhoneWithCountryCode(payload);
    validateCountryPhoneMatch(payload);
    validateIdentificationDocument(payload);

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
  serveLeadStepperScript,
  serveLeadBackupScript,
  submitLead
};
