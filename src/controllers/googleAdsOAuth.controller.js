const axios = require('axios');
const crypto = require('crypto');
const { env } = require('../config/env');

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
const OAUTH_STATE_COOKIE = 'google_ads_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

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

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isSecureRequest(req) {
  if (req.secure) {
    return true;
  }

  const forwardedProto = String(req.get('x-forwarded-proto') || '').toLowerCase();
  if (forwardedProto.includes('https')) {
    return true;
  }

  return String(env.NODE_ENV || '').toLowerCase() === 'production';
}

function setStateCookie(req, res, state) {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: 'lax',
    path: '/oauth/google-ads',
    maxAge: OAUTH_STATE_MAX_AGE_MS
  });
}

function clearStateCookie(res) {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/oauth/google-ads' });
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = decodeURIComponent(part.slice(0, separatorIndex).trim());
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
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

    setStateCookie(req, res, state);

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
    const state = String(req.query.state || '').trim();
    const cookies = parseCookies(req.get('cookie'));
    const stateCookie = String(cookies[OAUTH_STATE_COOKIE] || '').trim();

    if (!state || !stateCookie || !safeEqual(state, stateCookie)) {
      clearStateCookie(res);
      return res.status(400).json({
        ok: false,
        error: 'Invalid OAuth state'
      });
    }

    if (!code) {
      clearStateCookie(res);
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

    clearStateCookie(res);
    res.setHeader('Cache-Control', 'no-store');

    return res.json({
      ok: true,
      provider: 'google_ads',
      redirect_uri: redirectUri,
      token_type: data.token_type || '',
      expires_in: data.expires_in || null,
      refresh_token_received: Boolean(data.refresh_token),
      scope: data.scope || GOOGLE_ADS_SCOPE,
      note: 'OAuth exchange completed. Keep refresh tokens in server-side secrets only.'
    });
  } catch (error) {
    clearStateCookie(res);
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
