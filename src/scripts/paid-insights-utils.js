function parseArgs(argv) {
  const out = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const clean = arg.slice(2);
    const separator = clean.indexOf('=');

    if (separator === -1) {
      out[clean] = true;
      continue;
    }

    const key = clean.slice(0, separator);
    const value = clean.slice(separator + 1);
    out[key] = value;
  }

  return out;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getDateRange(args) {
  const today = new Date();
  const endDate = toIsoDate(args.end_date) || today.toISOString().slice(0, 10);

  if (args.start_date) {
    const startDate = toIsoDate(args.start_date);

    if (!startDate) {
      throw new Error('Invalid --start_date. Use YYYY-MM-DD');
    }

    return { startDate, endDate };
  }

  const days = Number.parseInt(args.days || '30', 10);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('Invalid --days value. Use a positive integer');
  }

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return { startDate: start.toISOString().slice(0, 10), endDate };
}

module.exports = {
  parseArgs,
  getDateRange
};
