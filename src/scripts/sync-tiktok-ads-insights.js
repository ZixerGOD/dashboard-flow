const { getPool } = require('../config/database');
const { parseArgs, getDateRange } = require('./paid-insights-utils');

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { startDate, endDate } = getDateRange(args);

  const token = process.env.TIKTOK_ACCESS_TOKEN || '';
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID || '';

  if (!token || !advertiserId) {
    throw new Error('Missing TIKTOK_ACCESS_TOKEN or TIKTOK_ADVERTISER_ID env vars');
  }

  console.log(
    JSON.stringify(
      {
        source: 'TIKTOK',
        start_date: startDate,
        end_date: endDate,
        status: 'not_implemented',
        message:
          'TikTok connector stub is ready. Next step: call TikTok Reporting API and map daily metrics into bi.fact_paid_campaign_daily.'
      },
      null,
      2
    )
  );
}

run()
  .catch((error) => {
    console.error('sync-tiktok-ads-insights failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
