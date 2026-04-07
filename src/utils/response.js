function createHttpError(statusCode, message, details) {
  const error = new Error(message);

  error.statusCode = statusCode;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data });
}

module.exports = {
  createHttpError,
  sendSuccess
};