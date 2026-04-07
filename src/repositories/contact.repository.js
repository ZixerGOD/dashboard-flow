const { getPool } = require('../config/database');
const { cleanEmail, cleanPhone } = require('../utils/sanitize');

async function findByPhoneOrEmail(contact) {
  const pool = getPool();

  if (!pool) {
    return null;
  }

  const phone = cleanPhone(contact.phone || '');
  const email = cleanEmail(contact.email || '');

  if (!phone && !email) {
    return null;
  }

  const { rows } = await pool.query(
    `
      SELECT cedula, full_name, email, phone
      FROM contacts
      WHERE (
        $1 <> '' AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = $1
      ) OR (
        $2 <> '' AND lower(coalesce(email, '')) = $2
      )
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [phone, email]
  );

  return rows[0] || null;
}

module.exports = { findByPhoneOrEmail };