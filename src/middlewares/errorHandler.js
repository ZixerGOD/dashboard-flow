const logger = require('../config/logger');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    ok: false,
    error: error.message || 'Internal Server Error'
  };

  if (error.details !== undefined) {
    payload.details = error.details;
  }

  if (statusCode >= 500) {
    logger.error({ err: error, path: req.originalUrl, method: req.method }, error.message || 'server error');
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;