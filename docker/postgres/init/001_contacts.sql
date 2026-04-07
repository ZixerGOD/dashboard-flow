CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  cedula VARCHAR(64),
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_email_lower
  ON contacts ((LOWER(email)));

CREATE INDEX IF NOT EXISTS idx_contacts_phone_digits
  ON contacts ((regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')));