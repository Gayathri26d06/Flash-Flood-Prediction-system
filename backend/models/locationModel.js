const { pool } = require('../config/db');

/**
 * Fetch all locations, joined with their most recent prediction
 * (risk_score / risk_level) if one exists.
 */
async function getAllLocations() {
  const [rows] = await pool.query(`
    SELECT
      l.id, l.name, l.district, l.state, l.latitude, l.longitude,
      l.elevation, l.slope, l.population, l.historical_risk, l.is_demo_data,
      p.risk_score, p.risk_level, p.confidence, p.lead_time
    FROM locations l
    LEFT JOIN (
      SELECT p1.*
      FROM predictions p1
      INNER JOIN (
        SELECT location_id, MAX(prediction_time) AS max_time
        FROM predictions
        GROUP BY location_id
      ) latest ON p1.location_id = latest.location_id AND p1.prediction_time = latest.max_time
    ) p ON p.location_id = l.id
    ORDER BY l.id ASC
  `);
  return rows;
}

async function getLocationById(id) {
  const [rows] = await pool.query(
    `SELECT
        l.id, l.name, l.district, l.state, l.latitude, l.longitude,
        l.elevation, l.slope, l.population, l.historical_risk, l.is_demo_data,
        p.risk_score, p.risk_level, p.confidence, p.lead_time
     FROM locations l
     LEFT JOIN (
        SELECT p1.*
        FROM predictions p1
        WHERE p1.location_id = ?
        ORDER BY p1.prediction_time DESC
        LIMIT 1
     ) p ON p.location_id = l.id
     WHERE l.id = ?`,
    [id, id]
  );
  return rows[0] || null;
}

async function locationExists(id) {
  const [rows] = await pool.query('SELECT id FROM locations WHERE id = ?', [id]);
  return rows.length > 0;
}

module.exports = { getAllLocations, getLocationById, locationExists };
