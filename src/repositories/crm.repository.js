const axios = require('axios');
const { env } = require('../config/env');

const client = axios.create({
  baseURL: env.CRM_BASE_URL,
  timeout: env.CRM_REQUEST_TIMEOUT_MS
});

function looksLikePhpRuntimeError(text) {
  const normalized = String(text || '').toLowerCase();
  return (
    normalized.includes('fatal error') ||
    normalized.includes('uncaught error') ||
    normalized.includes('<b>warning</b>') ||
    normalized.includes('stack trace')
  );
}

function evaluateCrmResponse(data) {
  if (data == null) {
    return { ok: false, message: 'Empty CRM response', response: null };
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();

    if (!trimmed) {
      return { ok: false, message: 'Empty CRM response body', response: data };
    }

    if (looksLikePhpRuntimeError(trimmed)) {
      return { ok: false, message: 'CRM runtime error response', response: data };
    }

    try {
      const parsed = JSON.parse(trimmed);
      return evaluateCrmResponse(parsed);
    } catch (parseError) {
      return { ok: false, message: 'Unexpected CRM response format', response: data };
    }
  }

  if (typeof data === 'object') {
    if (data.success === false) {
      return {
        ok: false,
        message: String(data.msg || data.message || 'CRM rejected lead').trim(),
        response: data
      };
    }

    if (data.success === true || data.ok === true) {
      return { ok: true, message: '', response: data };
    }

    if (String(data.result || '').trim().toLowerCase() === 'ok') {
      return { ok: true, message: '', response: data };
    }

    return {
      ok: false,
      message: 'Unexpected CRM response object',
      response: data
    };
  }

  return {
    ok: false,
    message: 'Unsupported CRM response type',
    response: data
  };
}

async function getLeadsByCampaign(campaignKey) {
  const { data } = await client.get(env.CRM_ENDPOINT, {
    params: {
      [env.CRM_CAMPAIGN_QUERY_PARAM]: campaignKey
    }
  });

  return Array.isArray(data) ? data : data?.data || [];
}

function normalizeCrmLeadPayload(payload = {}) {
  return {
    nombre: String(payload.nombre || '').trim(),
    apellido: String(payload.apellido || '').trim(),
    celular: String(payload.celular || '').trim(),
    correo: String(payload.correo || '').trim(),
    modalidad: String(payload.modalidad || '').trim(),
    comentario: String(payload.comentario || payload.mecanismo || '').trim(),
    procedencia: String(payload.procedencia || payload.platform || '').trim(),
    nivel: String(payload.nivel || '').trim(),
    cedula: String(payload.cedula || '').trim(),
    utm_campaign: String(payload.utm_campaign || '').trim(),
    canal_contacto: String(payload.canal_contacto || payload.como_te_contactamos || '').trim(),
    franja_horaria: String(payload.franja_horaria || '').trim(),
    ciudad: String(payload.ciudad || '').trim(),
    utm_source: String(payload.utm_source || '').trim(),
    utm_medium: String(payload.utm_medium || '').trim(),
    utm_content: String(payload.utm_content || '').trim(),
    utm_term: String(payload.utm_term || '').trim(),
    utm_id: String(payload.utm_id || '').trim(),
    programa: String(payload.programa || payload.campaign_name || '').trim()
  };
}

async function submitLead(payload) {
  if (!env.CRM_LEAD_POST_ENABLED) {
    return { skipped: true, reason: 'crm_lead_post_disabled' };
  }

  const mappedPayload = normalizeCrmLeadPayload(payload);
  try {
    const response = await client.post(env.CRM_LEAD_POST_ENDPOINT, mappedPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const evaluation = evaluateCrmResponse(response.data);
    if (!evaluation.ok) {
      const crmError = new Error(evaluation.message || 'crm_forward_failed');
      crmError.status_code = response.status;
      crmError.response_data = evaluation.response;
      throw crmError;
    }

    return {
      skipped: false,
      endpoint: env.CRM_LEAD_POST_ENDPOINT,
      status_code: response.status,
      response: evaluation.response,
      request_payload: mappedPayload
    };
  } catch (error) {
    const crmError = new Error(error?.message || 'crm_forward_failed');
    crmError.status_code = error?.status_code ?? error?.response?.status ?? null;
    crmError.response_data = error?.response_data ?? error?.response?.data ?? null;
    crmError.request_payload = mappedPayload;
    throw crmError;
  }
}

module.exports = {
  getLeadsByCampaign,
  submitLead
};
