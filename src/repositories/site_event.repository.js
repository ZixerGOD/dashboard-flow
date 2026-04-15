const { getPool } = require('../config/database');

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
    source,
    timestamp,
    metadata
  } = event;

  const query = `
    INSERT INTO site_events (
      campaign_key,
      campaign_name,
      event_type,
      form_name,
      page_url,
      thank_you_url,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      title,
      timestamp
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
  `;

  const values = [
    campaign_key || null,
    campaign_name || null,
    event_type || null,
    form_name || null,
    page_url || null,
    thank_you_url || null,
    source || null,
    metadata?.utm_source || null,
    metadata?.utm_medium || null,
    metadata?.utm_campaign || null,
    metadata?.utm_content || null,
    metadata?.utm_term || null,
    metadata?.referrer || null,
    metadata?.title || null,
    timestamp || new Date().toISOString()
  ];

  await pool.query(query, values);
}

module.exports = {
  saveEvent
};
