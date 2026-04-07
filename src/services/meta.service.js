const metaApi = require('../integrations/meta.api');
const { createHttpError } = require('../utils/response');
const { cleanEmail, cleanPhone, cleanText } = require('../utils/sanitize');

function extractLeadEvents(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const events = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      if (change?.field !== 'leadgen' || !change?.value) {
        continue;
      }

      events.push({
        pageId: change.value.page_id || entry.id || null,
        formId: change.value.form_id || null,
        leadgenId: change.value.leadgen_id || null,
        adId: change.value.ad_id || null,
        campaignId: change.value.campaign_id || null,
        adsetId: change.value.adset_id || null,
        createdTime: change.value.created_time || null
      });
    }
  }

  return events.filter(event => Boolean(event.leadgenId));
}

function fieldDataToObject(fieldData = []) {
  return fieldData.reduce((accumulator, field) => {
    if (field?.name) {
      accumulator[field.name] = field.value;
    }

    return accumulator;
  }, {});
}

async function hydrateLeadContext(event) {
  if (!event?.leadgenId) {
    throw createHttpError(400, 'Meta lead id is missing');
  }

  const lead = await metaApi.getLeadById(event.leadgenId);
  const adId = lead.ad_id || event.adId || null;
  const campaignContext = adId ? await metaApi.getAdContext(adId) : null;
  const fields = fieldDataToObject(lead.field_data);
  const name = cleanText(fields.full_name || fields.name || fields.first_name || '');
  const email = cleanEmail(fields.email || '');
  const phone = cleanPhone(fields.phone_number || fields.phone || fields.mobile_phone || '');

  return {
    metaLeadId: event.leadgenId,
    pageId: event.pageId || lead.page_id || null,
    formId: event.formId || lead.form_id || null,
    adId,
    campaignId: lead.campaign_id || event.campaignId || null,
    adsetId: lead.adset_id || event.adsetId || null,
    campaignName: campaignContext?.campaignName || lead.campaign_name || null,
    adsetName: campaignContext?.adsetName || lead.adset_name || null,
    submittedAt: lead.created_time || event.createdTime || null,
    contact: {
      name,
      email,
      phone
    },
    rawFields: fields
  };
}

module.exports = {
  extractLeadEvents,
  hydrateLeadContext
};