const axios = require('axios');
const { env } = require('../config/env');

const client = axios.create({
  baseURL: env.CRM_BASE_URL,
  timeout: env.CRM_REQUEST_TIMEOUT_MS
});

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

    return {
      skipped: false,
      endpoint: env.CRM_LEAD_POST_ENDPOINT,
      status_code: response.status,
      response: response.data
    };
  } catch (error) {
    const crmError = new Error(error?.message || 'crm_forward_failed');
    crmError.status_code = error?.response?.status || null;
    crmError.response_data = error?.response?.data ?? null;
    throw crmError;
  }
}

module.exports = {
  getLeadsByCampaign,
  submitLead
};
