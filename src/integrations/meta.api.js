const axios = require('axios');
const { metaConfig } = require('../config/meta');

const client = axios.create({
  baseURL: `https://graph.facebook.com/${metaConfig.graphVersion}`,
  timeout: metaConfig.timeoutMs
});

async function getLeadById(leadId) {
  const { data } = await client.get(`/${leadId}`, {
    params: {
      fields: 'field_data,created_time,ad_id,adset_id,campaign_id,form_id,page_id,campaign_name,adset_name',
      access_token: metaConfig.accessToken
    }
  });

  return data;
}

async function getAdContext(adId) {
  const { data } = await client.get(`/${adId}`, {
    params: {
      fields: 'name,campaign{name},adset{name}',
      access_token: metaConfig.accessToken
    }
  });

  return {
    campaignName: data?.campaign?.name || data?.campaign_name || null,
    adsetName: data?.adset?.name || data?.adset_name || null
  };
}

module.exports = {
  getLeadById,
  getAdContext
};