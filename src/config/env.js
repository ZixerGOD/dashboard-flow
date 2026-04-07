const dotenv = require('dotenv');

dotenv.config();

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

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
  REQUEST_TIMEOUT_MS: optionalInt('REQUEST_TIMEOUT_MS', 10000),
  SERVICE_NAME: optional('SERVICE_NAME', 'meta-leads-inconcert'),
  META_VERIFY_TOKEN: required('META_VERIFY_TOKEN'),
  META_APP_SECRET: required('META_APP_SECRET'),
  META_ACCESS_TOKEN: required('META_ACCESS_TOKEN'),
  META_GRAPH_VERSION: optional('META_GRAPH_VERSION', 'v20.0'),
  INCONCERT_BASE_URL: required('INCONCERT_BASE_URL'),
  INCONCERT_ENDPOINT: optional('INCONCERT_ENDPOINT', '/api/leads'),
  INCONCERT_TOKEN: optional('INCONCERT_TOKEN', ''),
  INCONCERT_API_KEY: optional('INCONCERT_API_KEY', ''),
  DATABASE_URL: optional('DATABASE_URL', ''),
  DATABASE_SSL: optionalBool('DATABASE_SSL', false),
  DATABASE_POOL_MAX: optionalInt('DATABASE_POOL_MAX', 10)
};

module.exports = { env };