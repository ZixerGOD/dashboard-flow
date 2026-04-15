const { sendSuccess } = require('../utils/response');
const insightsService = require('../services/insights.service');

async function ingestInsights(req, res, next) {
  try {
    const result = await insightsService.processInsightsPayload(req.body);
    return sendSuccess(res, result, 200);
  } catch (error) {
    return next(error);
  }
}

async function trackConversion(req, res, next) {
  try {
    const { campaign_name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, source, referrer, referrer_clean, referrer_full } = req.query;

    if (!campaign_name) {
      return sendPixel(res);
    }

    const payload = {
      campaign_name: String(campaign_name).substring(0, 255),
      event_type: 'iframe_form_conversion',
      source: source || 'iframe_form',
      skip_crm_match: true,
      form_name: 'third-party-form',
      page_url: req.get('referer') || '',
      referrer: referrer || referrer_clean || referrer_full || req.get('referer') || '',
      utm_source: utm_source ? String(utm_source).substring(0, 255) : '',
      utm_medium: utm_medium ? String(utm_medium).substring(0, 255) : '',
      utm_campaign: utm_campaign ? String(utm_campaign).substring(0, 255) : '',
      utm_content: utm_content ? String(utm_content).substring(0, 255) : '',
      utm_term: utm_term ? String(utm_term).substring(0, 255) : ''
    };

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