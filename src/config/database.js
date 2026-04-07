const { Pool } = require('pg');
const { env } = require('./env');

let pool = null;

if (env.DATABASE_URL) {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    max: env.DATABASE_POOL_MAX
  });
}

function getPool() {
  return pool;
}

module.exports = { getPool };