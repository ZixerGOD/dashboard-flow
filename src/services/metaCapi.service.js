const crypto = require('crypto');
const { env } = require('../config/env');

function clean(value) {
  return String(value == null ? '' : value).trim();
}

function onlyDigits(value) {
  return clean(value).replace(/\D/g, '');
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizePhone(value) {
  return onlyDigits(value);
}

function sha256(value) {
  const safeValue = clean(value);
  if (!safeValue) {
    return '';
  }

  return crypto.createHash('sha256').update(safeValue).digest('hex');
}

function buildEventName(payload) {
  const eventType = clean(payload.event_type).toUpperCase();
  if (eventType === 'FORM_WS' || eventType === 'FORM_WEB') {
    return 'Lead';
  }

  return 'Lead';
}

function pruneEmpty(obj) {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (!result[key]) {
      delete result[key];
    }
  });

  return result;
}

async function sendLeadToMetaCapi({ payload, req }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) {
    return { ok: false, skipped: true, reason: 'meta_capi_not_configured' };
  }

  const email = normalizeEmail(payload.correo || payload.email);
  const phone = normalizePhone(payload.celular || payload.phone || payload.telefono);
  const country = clean(payload.pais || payload.country || 'EC').toLowerCase();
  const city = clean(payload.ciudad || payload.city).toLowerCase();

  const userData = pruneEmpty({
    em: sha256(email),
    ph: sha256(phone),
    country: sha256(country),
    ct: sha256(city),
    fbc: clean(payload.fbc),
    fbp: clean(payload.fbp),
    client_ip_address: req.ip,
    client_user_agent: req.get('user-agent') || ''
  });

  const eventId = clean(payload.event_id);
  const requestBody = {
    data: [
      {
        event_name: buildEventName(payload),
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: clean(payload.page_url || req.get('referer') || ''),
        event_id: eventId || undefined,
        user_data: userData,
        custom_data: pruneEmpty({
          currency: 'USD',
          value: 1,
          content_name: clean(payload.programa || payload.campaign_name || ''),
          utm_source: clean(payload.utm_source),
          utm_medium: clean(payload.utm_medium),
          utm_campaign: clean(payload.utm_campaign),
          utm_content: clean(payload.utm_content),
          utm_term: clean(payload.utm_term),
          utm_id: clean(payload.utm_id)
        })
      }
    ]
  };

  if (env.META_CAPI_TEST_EVENT_CODE) {
    requestBody.test_event_code = env.META_CAPI_TEST_EVENT_CODE;
  }

  const graphVersion = env.META_GRAPH_VERSION || 'v20.0';
  const endpoint = `https://graph.facebook.com/${graphVersion}/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      status: response.status,
      response: responseData
    };
  }

  return {
    ok: true,
    skipped: false,
    status: response.status,
    response: responseData
  };
}

module.exports = { sendLeadToMetaCapi };
