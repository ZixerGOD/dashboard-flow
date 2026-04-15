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

async function upsertLead(contact) {
  const pool = getPool();

  if (!pool) {
    return null;
  }

  const cedula = String(contact.cedula || '').trim();
  const phone = cleanPhone(contact.phone || contact.celular || '');
  const email = cleanEmail(contact.email || contact.correo || '');

  const existing = await pool.query(
    `
      SELECT id
      FROM contacts
      WHERE (
        $1 <> '' AND coalesce(cedula, '') = $1
      ) OR (
        $2 <> '' AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = $2
      ) OR (
        $3 <> '' AND lower(coalesce(email, '')) = $3
      )
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [cedula, phone, email]
  );

  const params = [
    cedula || null,
    contact.full_name || null,
    contact.nombre || null,
    contact.apellido || null,
    email || null,
    phone || null,
    contact.modalidad || null,
    contact.nivel || null,
    contact.ciudad || null,
    contact.mecanismo_ingreso || contact.mecanismo || null,
    contact.como_te_contactamos || null,
    contact.franja_horaria || null,
    contact.programa || null
  ];

  if (existing.rows[0]) {
    const id = existing.rows[0].id;

    await pool.query(
      `
        UPDATE contacts
        SET
          cedula = $1,
          full_name = $2,
          nombre = $3,
          apellido = $4,
          email = $5,
          phone = $6,
          modalidad = $7,
          nivel = $8,
          ciudad = $9,
          mecanismo_ingreso = $10,
          como_te_contactamos = $11,
          franja_horaria = $12,
          programa = $13,
          updated_at = now()
        WHERE id = $14
      `,
      [...params, id]
    );

    return { id, action: 'updated' };
  }

  const insertResult = await pool.query(
    `
      INSERT INTO contacts (
        cedula,
        full_name,
        nombre,
        apellido,
        email,
        phone,
        modalidad,
        nivel,
        ciudad,
        mecanismo_ingreso,
        como_te_contactamos,
        franja_horaria,
        programa,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
      RETURNING id
    `,
    [
      cedula || null,
      contact.full_name || null,
      contact.nombre || null,
      contact.apellido || null,
      email || null,
      phone || null,
      contact.modalidad || null,
      contact.nivel || null,
      contact.ciudad || null,
      contact.mecanismo_ingreso || contact.mecanismo || null,
      contact.como_te_contactamos || null,
      contact.franja_horaria || null,
      contact.programa || null
    ]
  );

  return { id: insertResult.rows[0]?.id || null, action: 'inserted' };
}

module.exports = { findByPhoneOrEmail, upsertLead };