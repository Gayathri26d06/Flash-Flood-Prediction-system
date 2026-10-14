const { pool } = require('../config/db');

async function getDashboardStatistics() {
  const [[{ monitored_locations }]] = await pool.query(
    'SELECT COUNT(*) AS monitored_locations FROM locations'
  );

  const [[{ active_alerts }]] = await pool.query(
    `SELECT COUNT(*) AS active_alerts FROM alerts WHERE status = 'ACTIVE'`
  );

  const [[{ active_sensors }]] = await pool.query(
    `SELECT COUNT(DISTINCT location_id) AS active_sensors FROM sensor_data`
  );

  // Critical locations + average risk, based on each location's latest prediction
  const [latestPredictionRows] = await pool.query(`
    SELECT p1.location_id, p1.risk_score, p1.risk_level
    FROM predictions p1
    INNER JOIN (
      SELECT location_id, MAX(prediction_time) AS max_time
      FROM predictions
      GROUP BY location_id
    ) latest ON p1.location_id = latest.location_id AND p1.prediction_time = latest.max_time
  `);

  const critical_locations = latestPredictionRows.filter((r) => r.risk_level === 'CRITICAL').length;
  const average_risk = latestPredictionRows.length
    ? Math.round(
        (latestPredictionRows.reduce((sum, r) => sum + Number(r.risk_score), 0) /
          latestPredictionRows.length) * 100
      ) / 100
    : 0;

  return {
    monitored_locations,
    active_alerts,
    critical_locations,
    active_sensors,
    average_risk,
  };
}

module.exports = { getDashboardStatistics };
