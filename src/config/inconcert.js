const { env } = require('./env');

const inconcertConfig = {
  baseUrl: env.INCONCERT_BASE_URL,
  endpoint: env.INCONCERT_ENDPOINT,
  token: env.INCONCERT_TOKEN,
  apiKey: env.INCONCERT_API_KEY,
  timeoutMs: env.REQUEST_TIMEOUT_MS
};

module.exports = { inconcertConfig };