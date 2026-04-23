const logger = require('../config/logger');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || error.status || 500;
  const isServerError = statusCode >= 500;
  const payload = {
    ok: false,
    error: isServerError ? 'Internal Server Error' : error.message || 'Request failed'
  };

  if (!isServerError && error.details !== undefined) {
    payload.details = error.details;
  }

  if (isServerError) {
    logger.error({ err: error, path: req.originalUrl, method: req.method }, error.message || 'server error');
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
