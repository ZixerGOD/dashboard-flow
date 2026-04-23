const app = require('./app');
const logger = require('./config/logger');
const { env } = require('./config/env');
const { getPool } = require('./config/database');
const biMetricsRepository = require('./repositories/bi_metrics.repository');
const { startDailyPaidInsightsRefreshScheduler } = require('./services/paidInsightsRefresh.service');

async function start() {
  const pool = getPool();
  let stopPaidInsightsScheduler = null;
  let isShuttingDown = false;

  if (pool) {
    await pool.query('SELECT 1');
    logger.info('database connection ready');

    try {
      const syncResult = await biMetricsRepository.reconcileBiFromPublic();
      logger.info({ syncResult }, 'bi reconciliation completed');
    } catch (syncError) {
      logger.error({ err: syncError }, 'bi reconciliation failed at startup');
    }
  }

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server started');
  });

  stopPaidInsightsScheduler = startDailyPaidInsightsRefreshScheduler();

  const shutdown = () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;

    if (stopPaidInsightsScheduler) {
      stopPaidInsightsScheduler();
      stopPaidInsightsScheduler = null;
    }

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
