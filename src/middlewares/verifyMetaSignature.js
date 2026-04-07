const crypto = require('crypto');
const { createHttpError } = require('../utils/response');
const { metaConfig } = require('../config/meta');

function parseSignature(signature) {
  if (!signature || typeof signature !== 'string') {
    return null;
  }

  const [algorithm, hash] = signature.split('=');

  if (!algorithm || !hash) {
    return null;
  }

  return { algorithm, hash };
}

function timingSafeHexEqual(expected, received) {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyMetaSignature(req, res, next) {
  const rawBody = req.rawBody;
  const signatureHeader = req.get('x-hub-signature-256') || req.get('x-hub-signature');
  const parsed = parseSignature(signatureHeader);

  if (!rawBody || !parsed) {
    return next(createHttpError(401, 'Missing Meta signature'));
  }

  const algorithm = parsed.algorithm === 'sha256' ? 'sha256' : parsed.algorithm === 'sha1' ? 'sha1' : null;

  if (!algorithm) {
    return next(createHttpError(401, 'Unsupported Meta signature algorithm'));
  }

  const digest = crypto.createHmac(algorithm, metaConfig.appSecret).update(rawBody).digest('hex');

  if (!timingSafeHexEqual(digest, parsed.hash)) {
    return next(createHttpError(401, 'Invalid Meta signature'));
  }

  return next();
}

module.exports = verifyMetaSignature;