const axios = require('axios');
const { env } = require('../config/env');

const client = axios.create({
  baseURL: env.CRM_BASE_URL,
  timeout: env.CRM_REQUEST_TIMEOUT_MS
});

async function getLeadsByCampaign(campaignKey) {
  const { data } = await client.get(env.CRM_ENDPOINT, {
    params: {
      [env.CRM_CAMPAIGN_QUERY_PARAM]: campaignKey
    }
  });

  return Array.isArray(data) ? data : data?.data || [];
}

module.exports = {
  getLeadsByCampaign
};