const { pool } = require('../config/db');

/** Latest sensor reading for every location. */
async function getAllLatestSensorData() {
  const [rows] = await pool.query(`
    SELECT s1.*
    FROM sensor_data s1
    INNER JOIN (
      SELECT location_id, MAX(timestamp) AS max_ts
      FROM sensor_data
      GROUP BY location_id
    ) latest ON s1.location_id = latest.location_id AND s1.timestamp = latest.max_ts
    ORDER BY s1.location_id ASC
  `);
  return rows;
}

/** Latest sensor reading for a single location. */
async function getLatestSensorDataByLocation(locationId) {
  const [rows] = await pool.query(
    `SELECT * FROM sensor_data WHERE location_id = ? ORDER BY timestamp DESC LIMIT 1`,
    [locationId]
  );
  return rows[0] || null;
}

/** Recent history (for rainfall_3h/6h/24h aggregation and trend detection). */
async function getRecentSensorHistory(locationId, limit = 50) {
  const [rows] = await pool.query(
    `SELECT * FROM sensor_data WHERE location_id = ? ORDER BY timestamp DESC LIMIT ?`,
    [locationId, limit]
  );
  return rows;
}

async function insertSensorReading(reading) {
  const { location_id, rainfall, soil_moisture, river_level, humidity, temperature, is_synthetic = true } = reading;
  const [result] = await pool.query(
    `INSERT INTO sensor_data (location_id, rainfall, soil_moisture, river_level, humidity, temperature, is_synthetic)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [location_id, rainfall, soil_moisture, river_level, humidity, temperature, is_synthetic]
  );
  return result.insertId;
}

module.exports = {
  getAllLatestSensorData,
  getLatestSensorDataByLocation,
  getRecentSensorHistory,
  insertSensorReading,
};
