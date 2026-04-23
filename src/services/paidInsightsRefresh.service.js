const logger = require('../config/logger');
const { reconcileBiFromPublic } = require('../repositories/bi_metrics.repository');
const { syncGoogleAdsInsightsRange } = require('./googleAdsInsightsSync.service');
const { syncMetaInsightsRange } = require('./metaInsightsSync.service');

const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const DAILY_REFRESH_HOUR = 9;
const DAILY_REFRESH_MINUTE = 0;

let runningRefreshPromise = null;
let schedulerTimer = null;
let refreshState = {
  last_started_at: null
};

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultRefreshRange(now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 1);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  };
}

function serializeErrorDetails(error) {
  return error?.response?.data || error?.details || error?.message || 'unknown_error';
}

function createCooldownError(now = Date.now()) {
  const lastStartedAt = refreshState.last_started_at ? new Date(refreshState.last_started_at).getTime() : 0;
  const retryAfterMs = Math.max(MANUAL_REFRESH_COOLDOWN_MS - (now - lastStartedAt), 0);
  const error = new Error('Refresh reciente. Espera unos minutos antes de volver a actualizar.');
  error.statusCode = 429;
  error.details = {
    retry_after_ms: retryAfterMs,
    cooldown_ms: MANUAL_REFRESH_COOLDOWN_MS,
    last_started_at: refreshState.last_started_at
  };
  return error;
}

function getNextScheduledRunAt(now = new Date()) {
  const next = new Date(now);
  next.setHours(DAILY_REFRESH_HOUR, DAILY_REFRESH_MINUTE, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

async function runPlatformSync(source, syncFn, range) {
  try {
    const result = await syncFn(range);
    return { ok: true, ...result };
  } catch (error) {
    logger.error({ err: error, source, range }, 'paid insights platform refresh failed');
    return {
      ok: false,
      source,
      start_date: range.startDate,
      end_date: range.endDate,
      error: error.message || `Failed to refresh ${source}`,
      details: serializeErrorDetails(error)
    };
  }
}

async function refreshPaidInsights({ trigger = 'manual', startDate, endDate, force = false } = {}) {
  const now = Date.now();

  if (runningRefreshPromise) {
    return runningRefreshPromise;
  }

  if (!force && trigger === 'manual' && refreshState.last_started_at) {
    const lastStartedAt = new Date(refreshState.last_started_at).getTime();
    if (now - lastStartedAt < MANUAL_REFRESH_COOLDOWN_MS) {
      throw createCooldownError(now);
    }
  }

  const defaultRange = getDefaultRefreshRange();
  const range = {
    startDate: startDate || defaultRange.startDate,
    endDate: endDate || defaultRange.endDate
  };
  const startedAt = new Date().toISOString();

  refreshState = {
    last_started_at: startedAt
  };

  runningRefreshPromise = (async () => {
    const meta = await runPlatformSync('META', syncMetaInsightsRange, range);
    const google = await runPlatformSync('GOOGLE', syncGoogleAdsInsightsRange, range);
    const hasSuccessfulPlatform = meta.ok || google.ok;

    let biReconcile = null;
    if (hasSuccessfulPlatform) {
      try {
        biReconcile = {
          ok: true,
          result: await reconcileBiFromPublic()
        };
      } catch (error) {
        logger.error({ err: error, range, trigger }, 'paid insights bi reconciliation failed');
        biReconcile = {
          ok: false,
          error: error.message || 'BI reconcile failed',
          details: serializeErrorDetails(error)
        };
      }
    }

    const result = {
      ok: hasSuccessfulPlatform,
      trigger,
      start_date: range.startDate,
      end_date: range.endDate,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      platforms: {
        META: meta,
        GOOGLE: google
      },
      bi_reconcile: biReconcile
    };

    if (!hasSuccessfulPlatform) {
      const error = new Error('Paid insights refresh failed for all platforms');
      error.statusCode = 502;
      error.details = result;
      throw error;
    }

    return result;
  })().finally(() => {
    runningRefreshPromise = null;
  });

  return runningRefreshPromise;
}

function scheduleNextDailyRefresh() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
  }

  const nextRunAt = getNextScheduledRunAt();
  const delayMs = Math.max(nextRunAt.getTime() - Date.now(), 1000);

  logger.info({ nextRunAt: nextRunAt.toISOString() }, 'scheduled next paid insights refresh');

  schedulerTimer = setTimeout(async () => {
    try {
      await refreshPaidInsights({ trigger: 'scheduled', force: true });
      logger.info('scheduled paid insights refresh completed');
    } catch (error) {
      logger.error({ err: error }, 'scheduled paid insights refresh failed');
    } finally {
      scheduleNextDailyRefresh();
    }
  }, delayMs);
}

function startDailyPaidInsightsRefreshScheduler() {
  scheduleNextDailyRefresh();

  return function stopDailyPaidInsightsRefreshScheduler() {
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
  };
}

module.exports = {
  MANUAL_REFRESH_COOLDOWN_MS,
  refreshPaidInsights,
  startDailyPaidInsightsRefreshScheduler
};
