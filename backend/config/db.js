const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flood_prediction',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

/**
 * Simple helper to verify the DB connection at startup.
 * Does not throw — logs a clear error so the server can still
 * boot and report a meaningful health status.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[DB] MySQL connection established successfully.');
    return true;
  } catch (err) {
    console.error('[DB] Failed to connect to MySQL:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
