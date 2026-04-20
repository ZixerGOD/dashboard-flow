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

function getExpectedToken() {
  const credentials = `${env.DASHBOARD_USERNAME}:${env.DASHBOARD_PASSWORD}`;
  return crypto.createHmac('sha256', env.DASHBOARD_AUTH_SECRET).update(credentials).digest('hex');
}

function getAuthToken(req) {
  const cookies = parseCookies(req.get('cookie'));
  return cookies[COOKIE_NAME] || '';
}

function isAuthenticated(req) {
  return safeEqual(getAuthToken(req), getExpectedToken());
}

function requireDashboardAuth(req, res, next) {
  if (isAuthenticated(req)) {
    return next();
  }

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return res.redirect('/login');
}

function attachDashboardAuthCookie(res) {
  res.cookie(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
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
  isAuthenticated,
  requireDashboardAuth
};