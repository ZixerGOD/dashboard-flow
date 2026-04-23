const { getPool } = require('../config/database');
const { cleanUpper } = require('../utils/sanitize');

let ensuredSiteEventsSchema = false;

async function ensureSiteEventsSchema(client) {
  if (ensuredSiteEventsSchema) {
    return;
  }

  await client.query('ALTER TABLE site_events ADD COLUMN IF NOT EXISTS utm_id varchar(255)');
  ensuredSiteEventsSchema = true;
}

/**
 * Saves a site event (anonymous conversion) to the database.
 * @param {Object} event The mapped site event object.
 * @returns {Promise<void>}
 */
async function saveEvent(event) {
  const pool = getPool();

  if (!pool) {
    return;
  }

  const {
    campaign_key,
    campaign_name,
    event_type,
    form_name,
    page_url,
    thank_you_url,
    platform,
    timestamp,
    metadata
  } = event;

  const normalizedPlatform = String(platform || event.source || '').trim().toUpperCase() || null;

  await ensureSiteEventsSchema(pool);

  const query = `
    INSERT INTO site_events (
      campaign_key,
      campaign_name,
      event_type,
      form_name,
      page_url,
      thank_you_url,
      platform,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utm_id,
      referrer,
      title,
      timestamp
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING id
  `;

  const values = [
    cleanUpper(campaign_key) || null,
    cleanUpper(campaign_name) || null,
    cleanUpper(event_type) || null,
    cleanUpper(form_name) || null,
    page_url || null,
    thank_you_url || null,
    cleanUpper(normalizedPlatform) || null,
    cleanUpper(metadata?.utm_source) || null,
    cleanUpper(metadata?.utm_medium) || null,
    cleanUpper(metadata?.utm_campaign) || null,
    cleanUpper(metadata?.utm_content) || null,
    cleanUpper(metadata?.utm_term) || null,
    cleanUpper(metadata?.utm_id) || null,
    cleanUpper(metadata?.referrer) || null,
    cleanUpper(metadata?.title) || null,
    timestamp || new Date().toISOString()
  ];

  const result = await pool.query(query, values);
  return {
    id: result.rows[0]?.id || null
  };
}

module.exports = {
  saveEvent
};
