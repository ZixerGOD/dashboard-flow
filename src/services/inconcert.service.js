const inconcertApi = require('../integrations/inconcert.api');

function buildPayload(leadContext, matchedContact) {
  const cedula = matchedContact?.cedula || null;
  const identifierValue = cedula || leadContext.contact.phone || leadContext.contact.email || leadContext.metaLeadId;

  return {
    source: 'Meta Lead Ads',
    campaign_name: leadContext.campaignName,
    adset_name: leadContext.adsetName,
    lead: {
      name: leadContext.contact.name,
      email: leadContext.contact.email,
      phone: leadContext.contact.phone,
      cedula,
      identifier_type: cedula ? 'cedula' : 'phone',
      identifier_value: identifierValue,
      meta_lead_id: leadContext.metaLeadId,
      form_id: leadContext.formId,
      page_id: leadContext.pageId,
      ad_id: leadContext.adId,
      submitted_at: leadContext.submittedAt,
      raw_fields: leadContext.rawFields
    }
  };
}

async function sendLead(payload) {
  return inconcertApi.sendLead(payload);
}

module.exports = {
  buildPayload,
  sendLead
};