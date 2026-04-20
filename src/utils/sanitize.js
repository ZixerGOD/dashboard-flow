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
  cleanMaybeJsonValue
};