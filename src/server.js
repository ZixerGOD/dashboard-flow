const app = require('./app');
const logger = require('./config/logger');
const { env } = require('./config/env');
const { getPool } = require('./config/database');

async function start() {
  const pool = getPool();

  if (pool) {
    await pool.query('SELECT 1');
    logger.info('database connection ready');
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server started');
  });

  const shutdown = () => {
    server.close(() => {
      if (pool) {
        pool.end().finally(() => process.exit(0));
        return;
      }

      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('unhandledRejection', error => {
    logger.error({ err: error }, 'unhandled rejection');
  });
  process.on('uncaughtException', error => {
    logger.error({ err: error }, 'uncaught exception');
    shutdown();
  });
}

start().catch(error => {
  logger.error({ err: error }, 'failed to start server');
  process.exit(1);
});