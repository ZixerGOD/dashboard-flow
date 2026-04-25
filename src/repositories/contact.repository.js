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

function toComparableUpper(value) {
  const normalized = cleanUpper(value);
  return normalized || null;
}

function isSameAttribution(existing, incoming) {
  return toComparableUpper(existing.utm_source) === toComparableUpper(incoming.utm_source)
    && toComparableUpper(existing.utm_medium) === toComparableUpper(incoming.utm_medium)
    && toComparableUpper(existing.utm_campaign) === toComparableUpper(incoming.utm_campaign)
    && toComparableUpper(existing.utm_content) === toComparableUpper(incoming.utm_content)
    && toComparableUpper(existing.utm_term) === toComparableUpper(incoming.utm_term)
    && toComparableUpper(existing.utm_id) === toComparableUpper(incoming.utm_id);
}

function isSameLeadScope(existing, incoming) {
  return toComparableUpper(existing.modalidad) === toComparableUpper(incoming.modalidad)
    && toComparableUpper(existing.nivel) === toComparableUpper(incoming.nivel)
    && toComparableUpper(existing.programa) === toComparableUpper(incoming.programa);
}

async function upsertLead(contact, context = {}) {
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
  const paisUpper = cleanUpper(contact.pais || contact.country);
  const mecanismoIngresoUpper = cleanUpper(contact.mecanismo_ingreso || contact.mecanismo);
  const comoTeContactamosUpper = cleanUpper(contact.como_te_contactamos);
  const franjaHorariaUpper = cleanUpper(contact.franja_horaria);
  const programaUpper = cleanUpper(contact.programa);

  const existing = await pool.query(
    `
      SELECT
        c.id,
        c.lead_code,
        c.modalidad,
        c.nivel,
        c.programa,
        se.utm_source,
        se.utm_medium,
        se.utm_campaign,
        se.utm_content,
        se.utm_term,
        se.utm_id
      FROM contacts c
      LEFT JOIN lead_event_matches lem ON lem.contact_id = c.id
      LEFT JOIN site_events se ON se.id = lem.site_event_id
      WHERE (
        $1 <> '' AND coalesce(c.cedula, '') = $1
      ) OR (
        $2 <> '' AND regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = $2
      ) OR (
        $3 <> '' AND lower(coalesce(c.email, '')) = $3
      )
      ORDER BY lem.matched_at DESC NULLS LAST, se.timestamp DESC NULLS LAST, c.updated_at DESC NULLS LAST, c.id DESC
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
    paisUpper || null,
    mecanismoIngresoUpper || null,
    comoTeContactamosUpper || null,
    franjaHorariaUpper || null,
    programaUpper || null
  ];

  if (existing.rows[0]) {
    const existingLead = existing.rows[0];
    const id = existingLead.id;
    const shouldUpdateExisting = isSameLeadScope(existingLead, {
      modalidad: modalidadUpper,
      nivel: nivelUpper,
      programa: programaUpper
    }) && isSameAttribution(existingLead, {
      utm_source: context.utm_source,
      utm_medium: context.utm_medium,
      utm_campaign: context.utm_campaign,
      utm_content: context.utm_content,
      utm_term: context.utm_term,
      utm_id: context.utm_id
    });

    if (!shouldUpdateExisting) {
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
            pais,
            mecanismo_ingreso,
            como_te_contactamos,
            franja_horaria,
            programa,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
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
          paisUpper || null,
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
          pais = $10,
          mecanismo_ingreso = $11,
          como_te_contactamos = $12,
          franja_horaria = $13,
          programa = $14,
          updated_at = now()
        WHERE id = $15
      `,
      [...params, id]
    );

    return { id, lead_code: existingLead.lead_code || null, action: 'updated' };
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
        pais,
        mecanismo_ingreso,
        como_te_contactamos,
        franja_horaria,
        programa,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
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
      paisUpper || null,
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
