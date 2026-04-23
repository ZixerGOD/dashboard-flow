const crypto = require('crypto');
const { env } = require('../config/env');

const COOKIE_NAME = 'dashboard_auth';

function parseCookies(cookieHeader) {
  return String(cookieHeader || '')
    .split(';')
    .map(part => part.trim())
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

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isDashboardAuthConfigured() {
  return Boolean(
    String(env.DASHBOARD_USERNAME || '').trim()
    && String(env.DASHBOARD_PASSWORD || '').trim()
    && String(env.DASHBOARD_AUTH_SECRET || '').trim()
  );
}

function getExpectedToken() {
  if (!isDashboardAuthConfigured()) {
    return '';
  }

  const credentials = `${env.DASHBOARD_USERNAME}:${env.DASHBOARD_PASSWORD}`;
  return crypto.createHmac('sha256', env.DASHBOARD_AUTH_SECRET).update(credentials).digest('hex');
}

function toHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function verifyDashboardCredentials(username, password) {
  if (!isDashboardAuthConfigured()) {
    return false;
  }

  return safeEqual(toHash(username), toHash(env.DASHBOARD_USERNAME))
    && safeEqual(toHash(password), toHash(env.DASHBOARD_PASSWORD));
}

function getAuthToken(req) {
  const cookies = parseCookies(req.get('cookie'));
  return cookies[COOKIE_NAME] || '';
}

function isAuthenticated(req) {
  if (!isDashboardAuthConfigured()) {
    return false;
  }

  return safeEqual(getAuthToken(req), getExpectedToken());
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

function unauthorizedResponse(req, res) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return res.redirect('/login');
}

function requireDashboardAuth(req, res, next) {
  if (!isDashboardAuthConfigured()) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(503).json({ ok: false, error: 'Dashboard auth is not configured' });
    }

    return res.status(503).send('Dashboard auth is not configured');
  }

  if (isAuthenticated(req)) {
    return next();
  }

  return unauthorizedResponse(req, res);
}

function attachDashboardAuthCookie(req, res) {
  res.cookie(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  });
}

function clearDashboardAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

module.exports = {
  COOKIE_NAME,
  attachDashboardAuthCookie,
  clearDashboardAuthCookie,
  isDashboardAuthConfigured,
  isAuthenticated,
  requireDashboardAuth,
  verifyDashboardCredentials
};
