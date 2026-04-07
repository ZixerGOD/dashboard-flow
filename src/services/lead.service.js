const metaService = require('./meta.service');
const matchService = require('./match.service');
const inconcertService = require('./inconcert.service');
const { createHttpError } = require('../utils/response');

async function processWebhook(payload) {
  const events = metaService.extractLeadEvents(payload);

  if (!events.length) {
    throw createHttpError(400, 'No leadgen events found in Meta payload');
  }

  const results = [];

  for (const event of events) {
    const leadContext = await metaService.hydrateLeadContext(event);
    const matchedContact = await matchService.findContact(leadContext.contact);
    const payloadToSend = inconcertService.buildPayload(leadContext, matchedContact);
    const response = await inconcertService.sendLead(payloadToSend);

    results.push({
      metaLeadId: leadContext.metaLeadId,
      matched: Boolean(matchedContact),
      sent: true,
      inConcertResponse: response
    });
  }

  return { processed: results.length, results };
}

module.exports = { processWebhook };