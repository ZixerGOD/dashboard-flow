const { sendSuccess } = require('../utils/response');
const insightsService = require('../services/insights.service');

function normalizePlatform(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function cleanText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeEventType(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function isBlockedEventType(value) {
  return normalizeEventType(value) === 'LANDING_THANK_YOU_CONVERSION';
}

function applyDefaultAttribution(payload) {
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

async function ingestInsights(req, res, next) {
  try {
    if (Array.isArray(req.body?.rows)) {
      const originalCount = req.body.rows.length;
      req.body.rows = req.body.rows.filter(row => !isBlockedEventType(row?.event_type));
      const skippedCount = originalCount - req.body.rows.length;
      if (!req.body.rows.length) {
        return sendSuccess(res, { processed: 0, skipped: skippedCount, reason: 'blocked_event_type' }, 200);
      }
    } else if (isBlockedEventType(req.body?.event_type)) {
      return sendSuccess(res, { processed: 0, skipped: 1, reason: 'blocked_event_type' }, 200);
    }

    const result = await insightsService.processInsightsPayload(req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

async function trackConversion(req, res, next) {
  try {
    const {
      campaign_name,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utm_id,
      form_name,
      event_type,
      platform,
      source,
      referrer,
      referrer_clean,
      referrer_full
    } = req.query;

    if (!campaign_name) {
      return sendPixel(res);
    }

    if (isBlockedEventType(event_type)) {
      return sendPixel(res);
    }

    const payload = {
      campaign_name: String(campaign_name).substring(0, 255),
      event_type: event_type ? String(event_type).substring(0, 100) : 'iframe_form_conversion',
      platform: normalizePlatform(platform || source || 'landing'),
      skip_crm_match: true,
      form_name: form_name ? String(form_name).substring(0, 255) : 'third-party-form',
      page_url: req.get('referer') || '',
      referrer: referrer || referrer_clean || referrer_full || req.get('referer') || '',
      utm_source: utm_source ? String(utm_source).substring(0, 255) : '',
      utm_medium: utm_medium ? String(utm_medium).substring(0, 255) : '',
      utm_campaign: utm_campaign ? String(utm_campaign).substring(0, 255) : '',
      utm_content: utm_content ? String(utm_content).substring(0, 255) : '',
      utm_term: utm_term ? String(utm_term).substring(0, 255) : '',
      utm_id: utm_id ? String(utm_id).substring(0, 255) : ''
    };

    applyDefaultAttribution(payload);

    await insightsService.processInsightsPayload(payload);
    return sendPixel(res);
  } catch (error) {
    return sendPixel(res);
  }
}

function sendPixel(res) {
  const pixel = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x0a, 0x00, 0x01, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b]);
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(pixel);
}

module.exports = {
  ingestInsights,
  trackConversion
};
