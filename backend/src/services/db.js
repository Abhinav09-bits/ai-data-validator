// backend/src/services/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

/**
 * Run a query with optional parameters
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`  db: ${text.slice(0, 60)}... (${duration}ms)`);
    }
    return res;
  } catch (err) {
    console.error('DB query error:', err.message);
    console.error('Query:', text);
    throw err;
  }
}

/**
 * Get a client for transactions
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };