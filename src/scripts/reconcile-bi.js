const { reconcileBiFromPublic } = require('../repositories/bi_metrics.repository');
const { getPool } = require('../config/database');

async function main() {
  const result = await reconcileBiFromPublic();
  console.log('BI reconcile result:');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('BI reconcile failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });
