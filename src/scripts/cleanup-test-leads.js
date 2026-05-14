const { getPool } = require('../config/database');

async function run() {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = `
      WITH candidates AS (
        SELECT c.id
        FROM contacts c
        WHERE lower(coalesce(c.email, '')) LIKE '%test%'
           OR lower(coalesce(c.email, '')) LIKE '%prueba%'
           OR lower(coalesce(c.full_name, '')) LIKE '%test%'
           OR lower(coalesce(c.full_name, '')) LIKE '%prueba%'
           OR lower(coalesce(c.nombre, '')) LIKE '%test%'
           OR lower(coalesce(c.nombre, '')) LIKE '%prueba%'
           OR lower(coalesce(c.apellido, '')) LIKE '%test%'
           OR lower(coalesce(c.apellido, '')) LIKE '%prueba%'
      ),
      deleted_events AS (
        DELETE FROM site_events se
        USING lead_event_matches lem, candidates c
        WHERE se.id = lem.site_event_id
          AND lem.contact_id = c.id
        RETURNING se.id
      ),
      deleted_contacts AS (
        DELETE FROM contacts ct
        USING candidates c
        WHERE ct.id = c.id
        RETURNING ct.id
      )
      SELECT
        (SELECT COUNT(*) FROM deleted_events) AS deleted_site_events,
        (SELECT COUNT(*) FROM deleted_contacts) AS deleted_contacts;
    `;

    const result = await client.query(sql);
    await client.query('COMMIT');

    const row = result.rows[0] || { deleted_site_events: 0, deleted_contacts: 0 };
    console.log(JSON.stringify({ ok: true, ...row }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

run().catch((error) => {
  console.error('cleanup-test-leads failed:', error.message || error);
  process.exitCode = 1;
});
