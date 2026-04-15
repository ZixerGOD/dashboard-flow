const dotenv = require('dotenv');

dotenv.config();

function optional(name, defaultValue = '') {
  const value = process.env[name];

  return value === undefined || value === '' ? defaultValue : value;
}

function optionalInt(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }

  return parsed;
}

function optionalBool(name, defaultValue = false) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: optionalInt('PORT', 3000),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
  CORS_ALLOWED_ORIGINS: optional('CORS_ALLOWED_ORIGINS', '*'),
  REQUEST_TIMEOUT_MS: optionalInt('REQUEST_TIMEOUT_MS', 10000),
  SERVICE_NAME: optional('SERVICE_NAME', 'uees-insights-middleware'),
  CRM_BASE_URL: optional('CRM_BASE_URL', 'https://webservices.uees.edu.ec'),
  CRM_ENDPOINT: optional('CRM_ENDPOINT', '/contactcenter/getData/getLeadsByCampaign'),
  CRM_CAMPAIGN_QUERY_PARAM: optional('CRM_CAMPAIGN_QUERY_PARAM', 'c'),
  CRM_REQUEST_TIMEOUT_MS: optionalInt('CRM_REQUEST_TIMEOUT_MS', 30000),
  MAKE_WEBHOOK_TOKEN: optional('MAKE_WEBHOOK_TOKEN', ''),
  PRISMA_STUDIO_PORT: optionalInt('PRISMA_STUDIO_PORT', 5555),
  DATABASE_URL: optional('DATABASE_URL', ''),
  DATABASE_SSL: optionalBool('DATABASE_SSL', false),
  DATABASE_POOL_MAX: optionalInt('DATABASE_POOL_MAX', 10)
};

module.exports = { env };