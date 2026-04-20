const { getPool } = require('../config/database');
const { cleanEmail, cleanPhone, cleanUpper } = require('../utils/sanitize');

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
      SELECT lead_code, cedula, full_name, email, phone
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
  const emailUpper = email.toUpperCase();
  const cedulaUpper = cleanUpper(cedula);
  const fullNameUpper = cleanUpper(contact.full_name);
  const nombreUpper = cleanUpper(contact.nombre);
  const apellidoUpper = cleanUpper(contact.apellido);
  const modalidadUpper = cleanUpper(contact.modalidad);
  const nivelUpper = cleanUpper(contact.nivel);
  const ciudadUpper = cleanUpper(contact.ciudad);
  const mecanismoIngresoUpper = cleanUpper(contact.mecanismo_ingreso || contact.mecanismo);
  const comoTeContactamosUpper = cleanUpper(contact.como_te_contactamos);
  const franjaHorariaUpper = cleanUpper(contact.franja_horaria);
  const programaUpper = cleanUpper(contact.programa);

  const existing = await pool.query(
    `
      SELECT id, lead_code
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
    [cedulaUpper, phone, email]
  );

  const params = [
    cedulaUpper || null,
    fullNameUpper || null,
    nombreUpper || null,
    apellidoUpper || null,
    emailUpper || null,
    phone || null,
    modalidadUpper || null,
    nivelUpper || null,
    ciudadUpper || null,
    mecanismoIngresoUpper || null,
    comoTeContactamosUpper || null,
    franjaHorariaUpper || null,
    programaUpper || null
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

    return { id, lead_code: existing.rows[0].lead_code || null, action: 'updated' };
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
      RETURNING id, lead_code
    `,
    [
      cedulaUpper || null,
      fullNameUpper || null,
      nombreUpper || null,
      apellidoUpper || null,
      emailUpper || null,
      phone || null,
      modalidadUpper || null,
      nivelUpper || null,
      ciudadUpper || null,
      mecanismoIngresoUpper || null,
      comoTeContactamosUpper || null,
      franjaHorariaUpper || null,
      programaUpper || null
    ]
  );

  return {
    id: insertResult.rows[0]?.id || null,
    lead_code: insertResult.rows[0]?.lead_code || null,
    action: 'inserted'
  };
}

module.exports = { findByPhoneOrEmail, upsertLead };