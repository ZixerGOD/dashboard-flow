const { getPool } = require('../config/database');
const { reconcileBiFromPublic } = require('../repositories/bi_metrics.repository');
const { parseArgs, getDateRange } = require('./paid-insights-utils');
const { syncMetaInsightsRange } = require('../services/metaInsightsSync.service');

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { startDate, endDate } = getDateRange(args);
  const syncResult = await syncMetaInsightsRange({
    startDate,
    endDate,
    campaignName: args.campaign_name ? String(args.campaign_name).trim() : ''
  });
  const reconcileResult = await reconcileBiFromPublic();

  console.log(
    JSON.stringify(
      {
        ...syncResult,
        bi_reconcile: reconcileResult
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    const details = error?.response?.data || error.message;
    console.error('sync-meta-ads-insights failed:', JSON.stringify(details, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
