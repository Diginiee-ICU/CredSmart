const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                          // Up to 20 concurrent connections
  idleTimeoutMillis: 30000,         // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000,    // Return an error after 5s if connection cannot be established
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = pool;
