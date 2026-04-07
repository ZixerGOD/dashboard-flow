const { env } = require('./env');

const metaConfig = {
  appSecret: env.META_APP_SECRET,
  accessToken: env.META_ACCESS_TOKEN,
  graphVersion: env.META_GRAPH_VERSION,
  timeoutMs: env.REQUEST_TIMEOUT_MS,
  verifyToken: env.META_VERIFY_TOKEN
};

module.exports = { metaConfig };