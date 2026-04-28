function cleanText(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeDigits(value) {
  return cleanText(value).replace(/\D/g, '');
}

function normalizeCountryKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

const BLOCKED_EMAILS = new Set([
  'example@gmail.com',
  'test@gmail.com',
  'prueba@gmail.com',
  'correo@gmail.com',
  'mail@mail.com',
  'example@example.com',
  'test@test.com',
  'correo@correo.com',
  'noemail@noemail.com',
  'none@none.com'
]);

const BLOCKED_ECUADOR_MOBILES = new Set([
  '0999999999',
  '0988888888',
  '0977777777',
  '0966666666',
  '0955555555',
  '0944444444',
  '0933333333',
  '0922222222',
  '0911111111',
  '0900000000'
]);

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function isBlockedEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return false;
  }

  if (BLOCKED_EMAILS.has(normalized)) {
    return true;
  }

  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) {
    return true;
  }

  const suspiciousLocalParts = new Set(['example', 'test', 'tester', 'demo', 'prueba', 'correo', 'mail']);
  if (domain === 'gmail.com' && suspiciousLocalParts.has(localPart)) {
    return true;
  }

  return false;
}

function toEcuadorLocalMobile(phoneValue) {
  let digits = normalizeDigits(phoneValue);

  if (digits.startsWith('593')) {
    digits = digits.slice(3);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

function looksLikeEcuadorLead(countryValue, countryCodeValue, phoneValue) {
  const country = normalizeCountryKey(countryValue);
  const countryCodeDigits = normalizeDigits(countryCodeValue);
  const phoneDigits = normalizeDigits(phoneValue);

  if (country === 'EC' || country === 'ECUADOR') {
    return true;
  }

  if (countryCodeDigits === '593' || countryCodeDigits === '0593') {
    return true;
  }

  if (phoneDigits.startsWith('593') || phoneDigits.startsWith('09')) {
    return true;
  }

  return false;
}

function isClearlyFakePhone(digits) {
  if (!digits) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return true;
  }

  if (digits === '123456789' || digits === '987654321') {
    return true;
  }

  return false;
}

function isValidEcuadorMobile(phoneValue) {
  const normalized = toEcuadorLocalMobile(phoneValue);

  if (!/^9[2-9]\d{7}$/.test(normalized)) {
    return false;
  }

  if (isClearlyFakePhone(normalized)) {
    return false;
  }

  const localWithTrunk = `0${normalized}`;
  if (BLOCKED_ECUADOR_MOBILES.has(localWithTrunk)) {
    return false;
  }

  return true;
}

function validateLeadContactQuality(payload) {
  const email = payload?.correo || payload?.email || '';
  const phone = payload?.celular || payload?.phone || payload?.telefono || '';
  const country = payload?.pais || payload?.country || '';
  const countryCode = payload?.codigo_pais || payload?.country_code || '';

  if (isBlockedEmail(email)) {
    return {
      ok: false,
      code: 'email_blacklisted',
      message: 'El correo ingresado no es valido para registro.'
    };
  }

  const phoneDigits = normalizeDigits(phone);
  if (isClearlyFakePhone(phoneDigits)) {
    return {
      ok: false,
      code: 'phone_invalid_pattern',
      message: 'El numero de celular no es valido.'
    };
  }

  if (looksLikeEcuadorLead(country, countryCode, phone) && !isValidEcuadorMobile(phone)) {
    return {
      ok: false,
      code: 'phone_invalid_ec',
      message: 'El numero de celular de Ecuador no tiene un formato valido.'
    };
  }

  return { ok: true };
}

module.exports = {
  validateLeadContactQuality
};
