function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ');
}

function cleanUpper(value) {
  return cleanText(value).toUpperCase();
}

function cleanEmail(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function cleanPhone(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\D/g, '');
}

function normalizeCountryKey(value) {
  return String(value == null ? '' : value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function normalizeCountryIso2(value) {
  const key = normalizeCountryKey(value);

  if (!key) {
    return '';
  }

  if (/^[A-Z]{2}$/.test(key)) {
    return key;
  }

  const aliasMap = {
    ECUADOR: 'EC',
    COLOMBIA: 'CO',
    PERU: 'PE',
    MEXICO: 'MX',
    ESTADOS_UNIDOS: 'US',
    UNITED_STATES: 'US',
    USA: 'US',
    CANADA: 'CA',
    ARGENTINA: 'AR',
    CHILE: 'CL',
    BOLIVIA: 'BO',
    PARAGUAY: 'PY',
    URUGUAY: 'UY',
    VENEZUELA: 'VE',
    BRASIL: 'BR',
    BRAZIL: 'BR',
    ESPANA: 'ES',
    SPAIN: 'ES',
    ITALIA: 'IT',
    FRANCIA: 'FR',
    FRANCE: 'FR',
    ALEMANIA: 'DE',
    GERMANY: 'DE',
    REINO_UNIDO: 'GB',
    UNITED_KINGDOM: 'GB'
  };

  return aliasMap[key] || key;
}

function cleanMaybeJsonValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value !== 'string') {
    return cleanText(String(value));
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'value')) {
        return cleanText(parsed.value);
      }
    } catch (e) {
      return cleanText(trimmed);
    }
  }

  return cleanText(trimmed);
}

module.exports = {
  cleanText,
  cleanUpper,
  cleanEmail,
  cleanPhone,
  cleanMaybeJsonValue,
  normalizeCountryIso2
};
