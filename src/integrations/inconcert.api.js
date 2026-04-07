const axios = require('axios');
const { inconcertConfig } = require('../config/inconcert');

const client = axios.create({
  baseURL: inconcertConfig.baseUrl,
  timeout: inconcertConfig.timeoutMs
});

client.interceptors.request.use(config => {
  config.headers = config.headers || {};
  config.headers['content-type'] = 'application/json';

  if (inconcertConfig.token) {
    config.headers.Authorization = `Bearer ${inconcertConfig.token}`;
  }

  if (inconcertConfig.apiKey) {
    config.headers['x-api-key'] = inconcertConfig.apiKey;
  }

  return config;
});

async function sendLead(payload) {
  const { data } = await client.post(inconcertConfig.endpoint, payload);

  return data;
}

module.exports = { sendLead };