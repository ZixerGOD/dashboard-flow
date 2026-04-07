const pino = require('pino');
const { env } = require('./env');

const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: env.SERVICE_NAME
  }
});

module.exports = logger;