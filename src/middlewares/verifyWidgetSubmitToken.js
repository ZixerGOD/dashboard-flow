const crypto = require('crypto');
const { env } = require('../config/env');

const consumedNonces = new Map();

function cleanupNonces(nowMs) {
  consumedNonces.forEach((expiresAt, nonce) => {
    if (expiresAt <= nowMs) {
      consumedNonces.delete(nonce);
    }
  });
}

function extractToken(req) {
  const fromHeader = req.get('x-widget-token') || req.get('x-webhook-token');
  if (fromHeader) {
    return String(fromHeader).trim();
  }

  const auth = req.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match && match[1]) {
    return String(match[1]).trim();
  }

  return '';
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeOrigin(value) {
  return String(value || '').trim().toLowerCase();
}

function buildChallengeSignature({ nonce, ts, origin, userAgent }) {
  const payload = [
    String(nonce || '').trim(),
    String(ts || '').trim(),
    normalizeOrigin(origin),
    String(userAgent || '').trim()
  ].join('.');

  return crypto
    .createHmac('sha256', String(env.WIDGET_CHALLENGE_SECRET || ''))
    .update(payload)
    .digest('hex');
}

function extractChallengeFromRequest(req) {
  return {
    nonce: String(req.get('x-widget-nonce') || '').trim(),
    ts: String(req.get('x-widget-ts') || '').trim(),
    signature: String(req.get('x-widget-proof') || '').trim()
  };
}

function verifyChallenge(req) {
  if (!env.WIDGET_CHALLENGE_SECRET) {
    return { ok: false, reason: 'challenge_not_configured' };
  }

  const ttlSeconds = Math.max(30, Number(env.WIDGET_CHALLENGE_TTL_SECONDS) || 120);
  const nowMs = Date.now();
  cleanupNonces(nowMs);

  const challenge = extractChallengeFromRequest(req);
  if (!challenge.nonce || !challenge.ts || !challenge.signature) {
    return { ok: false, reason: 'challenge_missing' };
  }

  const tsNumber = Number.parseInt(challenge.ts, 10);
  if (Number.isNaN(tsNumber)) {
    return { ok: false, reason: 'challenge_ts_invalid' };
  }

  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - tsNumber);
  if (ageSeconds > ttlSeconds) {
    return { ok: false, reason: 'challenge_expired' };
  }

  if (consumedNonces.has(challenge.nonce)) {
    return { ok: false, reason: 'challenge_replayed' };
  }

  const origin = req.get('origin') || req.get('referer') || '';
  const userAgent = req.get('user-agent') || '';
  const expected = buildChallengeSignature({
    nonce: challenge.nonce,
    ts: challenge.ts,
    origin,
    userAgent
  });

  if (!safeEqual(challenge.signature, expected)) {
    return { ok: false, reason: 'challenge_invalid' };
  }

  consumedNonces.set(challenge.nonce, nowMs + (ttlSeconds * 1000));
  return { ok: true };
}

function createWidgetSubmitChallenge(req, res) {
  if (!env.WIDGET_CHALLENGE_SECRET) {
    return res.status(503).json({ ok: false, error: 'Widget challenge not configured' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const ts = String(Math.floor(Date.now() / 1000));
  const origin = req.get('origin') || req.get('referer') || '';
  const userAgent = req.get('user-agent') || '';
  const signature = buildChallengeSignature({ nonce, ts, origin, userAgent });

  return res.status(200).json({
    ok: true,
    data: {
      nonce,
      ts,
      signature,
      ttl_seconds: Math.max(30, Number(env.WIDGET_CHALLENGE_TTL_SECONDS) || 120)
    }
  });
}

function verifyWidgetSubmitToken(req, res, next) {
  if (env.WIDGET_CHALLENGE_SECRET) {
    const challenge = verifyChallenge(req);
    if (!challenge.ok) {
      return res.status(401).json({ ok: false, error: 'Invalid widget challenge', reason: challenge.reason });
    }
    return next();
  }

  if (!env.WIDGET_SUBMIT_TOKEN) {
    return next();
  }

  const incoming = extractToken(req);
  const expected = String(env.WIDGET_SUBMIT_TOKEN || '').trim();

  if (!incoming || !safeEqual(incoming, expected)) {
    return res.status(401).json({ ok: false, error: 'Invalid widget token' });
  }

  return next();
}

module.exports = {
  verifyWidgetSubmitToken,
  createWidgetSubmitChallenge
};
