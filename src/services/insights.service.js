const crmRepository = require('../repositories/crm.repository');
const contactRepository = require('../repositories/contact.repository');
const siteEventRepository = require('../repositories/site_event.repository');
const biMetricsRepository = require('../repositories/bi_metrics.repository');
const logger = require('../config/logger');
const { cleanText, cleanMaybeJsonValue } = require('../utils/sanitize');
const { createHttpError } = require('../utils/response');

function normalizeCountry(country) {
  return cleanText(country).toLowerCase();
}

function normalizeCampaignKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function toArrayPayload(payload) {
  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

function uniqueCount(items, fieldName) {
  return new Set(
    items
      .map(item => cleanText(item?.[fieldName] || '').toLowerCase())
      .filter(Boolean)
  ).size;
}

function summarizeCrmLeads(leads, country) {
  const normalizedCountry = normalizeCountry(country);
  const filteredLeads = normalizedCountry
    ? leads.filter(lead => normalizeCountry(lead?.pais) === normalizedCountry)
    : leads;

  return {
    total: filteredLeads.length,
    unique_emails: uniqueCount(filteredLeads, 'correo'),
    unique_phones: uniqueCount(filteredLeads, 'celular'),
    countries: [...new Set(filteredLeads.map(lead => cleanText(lead?.pais || '')).filter(Boolean))]
  };
}

function mapInsightsRow(row, crmLeads) {
  const campaignName = row.campaign_name || row.campaignName || row.campaign || '';
  const campaignKey = row.campaign_key || row.campaign_key_name || normalizeCampaignKey(campaignName);
  const country = row.country || row.pais || row.geo_country || '';
  const campaignLeads = summarizeCrmLeads(crmLeads, country);

  return {
    campaign_key: campaignKey,
    campaign_name: campaignName,
    adset_name: row.adset_name || row.adsetName || '',
    country,
    date_start: row.date_start || row.start_date || null,
    date_stop: row.date_stop || row.end_date || null,
    metrics: {
      spend: Number(row.spend || row.spend_amount || 0),
      clicks: Number(row.clicks || 0),
      cpc: Number(row.cpc || 0),
      impressions: Number(row.impressions || 0),
      reach: Number(row.reach || 0),
      conversions: Number(row.conversions || row.actions || 0)
    },
    crm: campaignLeads
  };
}

function shouldSkipCrmMatch(row) {
  if (row?.skip_crm_match === true) {
    return true;
  }

  if (typeof row?.skip_crm_match === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(row.skip_crm_match.toLowerCase());
  }

  return row?.source === 'wordpress' || row?.source === 'site' || row?.source === 'web' || row?.source === 'fb' || row?.event_type === 'wordpress_thank_you';
}

function stripLabeledValue(value) {
  const text = cleanMaybeJsonValue(value);

  if (!text) {
    return '';
  }

  const match = text.match(/^\s*\d+\.\s*[^:]+:\s*(.+)$/);
  if (match && match[1]) {
    return cleanMaybeJsonValue(match[1]);
  }

  return text;
}

function normalizeSource(value) {
  const normalized = stripLabeledValue(value).toLowerCase();

  if (!normalized) {
    return '';
  }

  if (
    ['fb', 'facebook', 'meta'].includes(normalized) ||
    normalized.includes('facebook') ||
    normalized.includes('meta') ||
    normalized.includes('form nativo')
  ) {
    return 'fb';
  }

  if (
    ['web', 'site', 'website', 'wordpress', 'widget', 'iframe_form'].includes(normalized) ||
    normalized.includes('wordpress') ||
    normalized.includes('site') ||
    normalized.includes('widget') ||
    normalized.includes('web')
  ) {
    return 'web';
  }

  return '';
}

function inferSource(row) {
  const explicitSource = normalizeSource(row.source || row.origen || row.platform || row.plataforma || row.referrer || row.referrer_clean || row.referrer_full || '');

  if (explicitSource) {
    return explicitSource;
  }

  const source = cleanMaybeJsonValue(row.source || row.origen || '').toLowerCase();
  const formName = cleanMaybeJsonValue(row.form_name || row.formName || '').toLowerCase();
  const eventType = cleanMaybeJsonValue(row.event_type || '').toLowerCase();
  const joined = `${source} ${formName} ${eventType}`;

  if (joined.includes('facebook') || joined.includes('meta') || joined.includes(' fb ') || joined.includes('form nativo')) {
    return 'fb';
  }

  if (
    source === 'wordpress' ||
    source === 'site' ||
    source === 'widget_form' ||
    source === 'iframe_form' ||
    source === 'web' ||
    joined.includes('widget') ||
    joined.includes('wordpress')
  ) {
    return 'web';
  }

  return '';
}

function mapSiteEventRow(row) {
  const campaignName = cleanMaybeJsonValue(row.campaign_name || row.campaignName || row.form_name || row.page_url || 'wordpress-site-event');

  return {
    campaign_key: cleanMaybeJsonValue(row.campaign_key || row.campaign_key_name || normalizeCampaignKey(campaignName)),
    campaign_name: campaignName,
    event_type: stripLabeledValue(row.event_type || 'wordpress_thank_you'),
    form_name: stripLabeledValue(row.form_name || row.formName || ''),
    page_url: cleanMaybeJsonValue(row.page_url || row.pageUrl || ''),
    thank_you_url: cleanMaybeJsonValue(row.thank_you_url || row.thankYouUrl || ''),
    source: inferSource(row) || cleanMaybeJsonValue(row.source || 'web'),
    timestamp: row.timestamp || row.occurred_at || new Date().toISOString(),
    metadata: {
      utm_source: stripLabeledValue(row.utm_source || ''),
      utm_medium: stripLabeledValue(row.utm_medium || ''),
      utm_campaign: stripLabeledValue(row.utm_campaign || ''),
      utm_content: stripLabeledValue(row.utm_content || ''),
      utm_term: stripLabeledValue(row.utm_term || ''),
      referrer: stripLabeledValue(row.referrer || row.referrer_clean || row.referrer_full || row.referrer_url || ''),
      title: stripLabeledValue(row.title || '')
    }
  };
}

function mapContactRow(row) {
  const nombre = stripLabeledValue(row.nombre || row.first_name || row.firstName || '');
  const apellido = stripLabeledValue(row.apellido || row.last_name || row.lastName || '');
  const fullName = stripLabeledValue(row.full_name || row.fullName || `${nombre} ${apellido}`);

  return {
    cedula: stripLabeledValue(row.cedula || row.documento || row.ci || ''),
    full_name: fullName,
    nombre,
    apellido,
    email: stripLabeledValue(row.correo || row.email || ''),
    phone: stripLabeledValue(row.celular || row.phone || row.telefono || ''),
    modalidad: stripLabeledValue(row.modalidad || ''),
    nivel: stripLabeledValue(row.nivel || ''),
    ciudad: stripLabeledValue(row.ciudad || row.city || ''),
    mecanismo_ingreso: stripLabeledValue(row.mecanismo || row.mecanismo_ingreso || ''),
    como_te_contactamos: stripLabeledValue(row.como_te_contactamos || ''),
    franja_horaria: stripLabeledValue(row.franja_horaria || ''),
    programa: stripLabeledValue(row.programa || row.campaign_name || row.campaignName || '')
  };
}

function isLeadFormPayload(row) {
  return Boolean(
    cleanMaybeJsonValue(row.nombre || row.apellido || row.correo || row.celular || row.programa || row.modalidad || row.nivel || row.ciudad || row.mecanismo || row.como_te_contactamos || row.franja_horaria)
  );
}

async function processInsightsPayload(payload) {
  const rows = toArrayPayload(payload);

  if (!rows.length) {
    throw createHttpError(400, 'No insights rows found in payload');
  }

  const results = [];
  const crmCache = new Map();

  for (const row of rows) {
    const campaignName = row.campaign_name || row.campaignName || row.campaign || '';
    if (!campaignName) {
      throw createHttpError(400, 'campaign_name is required in each insights row');
    }

    if (shouldSkipCrmMatch(row) || isLeadFormPayload(row)) {
      const siteEvent = mapSiteEventRow(row);
      const contact = mapContactRow(row);

      await siteEventRepository.saveEvent(siteEvent);
      const contactResult = await contactRepository.upsertLead(contact);

      try {
        await biMetricsRepository.recordSiteEventMetrics({
          siteEvent,
          contactId: contactResult?.id || null
        });
      } catch (metricsError) {
        logger.error({ err: metricsError }, 'Failed to update BI metrics');
      }

      results.push(siteEvent);
      continue;
    }

    const campaignKey = normalizeCampaignKey(row.campaign_key || row.campaign_key_name || campaignName);
    let crmLeads = crmCache.get(campaignKey);

    if (!crmLeads) {
      crmLeads = await crmRepository.getLeadsByCampaign(campaignKey);
      crmCache.set(campaignKey, crmLeads);
    }

    results.push(mapInsightsRow(row, crmLeads));
  }

  return {
    processed: results.length,
    results
  };
}

module.exports = {
  processInsightsPayload,
  normalizeCampaignKey
};