const { pool } = require('../config/db');

async function getAllLatestPredictions() {
  const [rows] = await pool.query(`
    SELECT p1.*, l.name AS location_name, l.district, l.state
    FROM predictions p1
    INNER JOIN (
      SELECT location_id, MAX(prediction_time) AS max_time
      FROM predictions
      GROUP BY location_id
    ) latest ON p1.location_id = latest.location_id AND p1.prediction_time = latest.max_time
    INNER JOIN locations l ON l.id = p1.location_id
    ORDER BY p1.risk_score DESC
  `);
  return rows;
}

async function getLatestPredictionByLocation(locationId) {
  const [rows] = await pool.query(
    `SELECT * FROM predictions WHERE location_id = ? ORDER BY prediction_time DESC LIMIT 1`,
    [locationId]
  );
  return rows[0] || null;
}

async function insertPrediction(prediction) {
  const {
    location_id, risk_score, risk_level, lead_time, confidence,
    ml_risk_score = null, rule_adjustment = 0,
  } = prediction;

  const [result] = await pool.query(
    `INSERT INTO predictions
       (location_id, risk_score, risk_level, lead_time, confidence, ml_risk_score, rule_adjustment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [location_id, risk_score, risk_level, lead_time, confidence, ml_risk_score, rule_adjustment]
  );
  return result.insertId;
}

module.exports = { getAllLatestPredictions, getLatestPredictionByLocation, insertPrediction };
