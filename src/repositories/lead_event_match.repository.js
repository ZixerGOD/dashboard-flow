const { getPool } = require('../config/database');

async function createMatch({ contactId, siteEventId, leadCode, matchType }) {
  const pool = getPool();

  if (!pool || !contactId || !siteEventId || !leadCode) {
    return null;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO lead_event_matches (
        contact_id,
        site_event_id,
        lead_code,
        match_type,
        matched_at
      ) VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (site_event_id)
      DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        lead_code = EXCLUDED.lead_code,
        match_type = EXCLUDED.match_type,
        matched_at = now()
      RETURNING id, contact_id, site_event_id, lead_code, match_type, matched_at
    `,
    [contactId, siteEventId, leadCode, String(matchType || 'INGEST').trim().toUpperCase()]
  );

  return rows[0] || null;
}

module.exports = {
  createMatch
};
