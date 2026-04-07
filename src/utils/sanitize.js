function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ');
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

module.exports = {
  cleanText,
  cleanEmail,
  cleanPhone
};