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
  APP_PUBLIC_URL: optional('APP_PUBLIC_URL', 'https://webservices.devmaniacs.net'),
  CORS_ALLOWED_ORIGINS: optional('CORS_ALLOWED_ORIGINS', '*'),
  REQUEST_TIMEOUT_MS: optionalInt('REQUEST_TIMEOUT_MS', 10000),
  SERVICE_NAME: optional('SERVICE_NAME', 'uees-insights-middleware'),
  CRM_BASE_URL: optional('CRM_BASE_URL', 'https://webservices.uees.edu.ec'),
  CRM_ENDPOINT: optional('CRM_ENDPOINT', '/contactcenter/getData/getLeadsByCampaign'),
  CRM_CAMPAIGN_QUERY_PARAM: optional('CRM_CAMPAIGN_QUERY_PARAM', 'c'),
  CRM_REQUEST_TIMEOUT_MS: optionalInt('CRM_REQUEST_TIMEOUT_MS', 30000),
  MAKE_WEBHOOK_TOKEN: optional('MAKE_WEBHOOK_TOKEN', ''),
  DASHBOARD_USERNAME: optional('DASHBOARD_USERNAME', 'admin'),
  DASHBOARD_PASSWORD: optional('DASHBOARD_PASSWORD', 'UEES2026#'),
  DASHBOARD_AUTH_SECRET: optional('DASHBOARD_AUTH_SECRET', 'c2zUcbcj5W6Q8lF3kI9nqjvXyYl2r7'),
  GOOGLE_ADS_CLIENT_ID: optional('GOOGLE_ADS_CLIENT_ID', ''),
  GOOGLE_ADS_CLIENT_SECRET: optional('GOOGLE_ADS_CLIENT_SECRET', ''),
  GOOGLE_ADS_REDIRECT_PATH: optional('GOOGLE_ADS_REDIRECT_PATH', '/oauth/google-ads/callback'),
  PRISMA_STUDIO_PORT: optionalInt('PRISMA_STUDIO_PORT', 5555),
  DATABASE_URL: optional('DATABASE_URL', ''),
  DATABASE_SSL: optionalBool('DATABASE_SSL', false),
  DATABASE_POOL_MAX: optionalInt('DATABASE_POOL_MAX', 10),
  GOOGLE_ADS_DEVELOPER_TOKEN: optional('GOOGLE_ADS_DEVELOPER_TOKEN', ''),
  GOOGLE_ADS_CUSTOMER_ID: optional('GOOGLE_ADS_CUSTOMER_ID', ''),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: optional('GOOGLE_ADS_LOGIN_CUSTOMER_ID', ''),
  GOOGLE_ADS_REFRESH_TOKEN: optional('GOOGLE_ADS_REFRESH_TOKEN', ''),
  GOOGLE_ADS_API_VERSION: optional('GOOGLE_ADS_API_VERSION', 'v20'),
  META_ACCESS_TOKEN: optional('META_ACCESS_TOKEN', ''),
  META_AD_ACCOUNT_ID: optional('META_AD_ACCOUNT_ID', ''),
  META_GRAPH_VERSION: optional('META_GRAPH_VERSION', 'v20.0'),
  TIKTOK_ACCESS_TOKEN: optional('TIKTOK_ACCESS_TOKEN', ''),
  TIKTOK_ADVERTISER_ID: optional('TIKTOK_ADVERTISER_ID', ''),
  TIKTOK_API_BASE_URL: optional('TIKTOK_API_BASE_URL', 'https://business-api.tiktok.com/open_api/v1.3')
};

module.exports = { env };