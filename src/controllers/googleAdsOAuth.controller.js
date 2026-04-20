const axios = require('axios');
const crypto = require('crypto');
const { env } = require('../config/env');

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizePath(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '/oauth/google-ads/callback';
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

function buildRedirectUri() {
  const baseUrl = normalizeBaseUrl(env.APP_PUBLIC_URL);
  const path = normalizePath(env.GOOGLE_ADS_REDIRECT_PATH);

  if (!baseUrl) {
    throw new Error('APP_PUBLIC_URL is required to build Google Ads redirect URI');
  }

  return `${baseUrl}${path}`;
}

function createAuthState() {
  return crypto.randomBytes(16).toString('hex');
}

function getRedirectUri(req, res) {
  const redirectUri = buildRedirectUri();

  return res.json({
    ok: true,
    provider: 'google_ads',
    redirect_uri: redirectUri,
    instructions: 'Add this URI in Google Cloud Console > OAuth 2.0 Client > Authorized redirect URIs.'
  });
}

function startGoogleAdsAuth(req, res, next) {
  try {
    if (!env.GOOGLE_ADS_CLIENT_ID) {
      return res.status(500).json({
        ok: false,
        error: 'GOOGLE_ADS_CLIENT_ID is not configured'
      });
    }

    const redirectUri = buildRedirectUri();
    const state = createAuthState();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_ADS_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    return res.redirect(`${GOOGLE_OAUTH_URL}?${params.toString()}`);
  } catch (error) {
    return next(error);
  }
}

async function googleAdsCallback(req, res, next) {
  try {
    if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET) {
      return res.status(500).json({
        ok: false,
        error: 'Google Ads OAuth credentials are not configured'
      });
    }

    const code = String(req.query.code || '').trim();

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: 'Missing authorization code'
      });
    }

    const redirectUri = buildRedirectUri();
    const payload = new URLSearchParams({
      code,
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { data } = await axios.post(GOOGLE_TOKEN_URL, payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });

    return res.json({
      ok: true,
      provider: 'google_ads',
      redirect_uri: redirectUri,
      token_type: data.token_type || '',
      expires_in: data.expires_in || null,
      access_token: data.access_token || '',
      refresh_token: data.refresh_token || '',
      scope: data.scope || GOOGLE_ADS_SCOPE,
      note: 'Save refresh_token securely. Use it for scheduled Google Ads insights sync jobs.'
    });
  } catch (error) {
    const details = error?.response?.data || error.message;

    return res.status(400).json({
      ok: false,
      provider: 'google_ads',
      error: 'OAuth callback failed',
      details
    });
  }
}

module.exports = {
  getRedirectUri,
  startGoogleAdsAuth,
  googleAdsCallback
};
