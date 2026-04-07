const logger = require('../config/logger');

function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        ip: req.ip
      },
      'request completed'
    );
  });

  next();
}

module.exports = requestLogger;