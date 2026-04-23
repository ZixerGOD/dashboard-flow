function createRateLimit({ windowMs, max, keyGenerator, message = 'Too many requests' }) {
  const hits = new Map();
  const safeWindowMs = Math.max(1000, Number(windowMs) || 60000);
  const safeMax = Math.max(1, Number(max) || 60);
  const resolveKey = typeof keyGenerator === 'function'
    ? keyGenerator
    : (req) => String(req.ip || req.get('x-forwarded-for') || 'unknown');

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = resolveKey(req);
    const entry = hits.get(key);

    if (!entry || entry.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + safeWindowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > safeMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ ok: false, error: message });
    }

    return next();
  };
}

module.exports = {
  createRateLimit
};
