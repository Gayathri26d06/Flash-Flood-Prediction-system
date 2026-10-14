const { pool } = require('../config/db');

/**
 * Data access for the manual AI Disaster Check scenarios.
 *
 * The newest row in `manual_disaster_scenarios` is the ACTIVE SCENARIO —
 * the single source of truth consumed by the Risk Map, AI Predictions,
 * Alerts, Simulation and Evacuation modules.
 *
 * Nothing here deletes scenarios: older rows stay as history (spec §14).
 */

const SCENARIO_COLUMNS = `
  id, scenario_uid, location_name, district, state, country, address,
  latitude, longitude, rainfall, temperature, humidity, soil_moisture,
  disaster, prediction, probability, risk_level, message, model_source, created_at
`;

async function insertScenario(scenario) {
  const {
    scenario_uid,
    location_name,
    district = null,
    state = null,
    country = null,
    address = null,
    latitude,
    longitude,
    rainfall,
    temperature,
    humidity,
    soil_moisture,
    disaster,
    prediction,
    probability,
    risk_level,
    message = null,
    model_source = 'Prototype Random Forest classifier',
  } = scenario;

  const [result] = await pool.query(
    `INSERT INTO manual_disaster_scenarios
       (scenario_uid, location_name, district, state, country, address,
        latitude, longitude, rainfall, temperature, humidity, soil_moisture,
        disaster, prediction, probability, risk_level, message, model_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scenario_uid,
      location_name,
      district,
      state,
      country,
      address,
      latitude,
      longitude,
      rainfall,
      temperature,
      humidity,
      soil_moisture,
      disaster ? 1 : 0,
      prediction,
      probability,
      risk_level,
      message,
      model_source,
    ]
  );

  return result.insertId;
}

/** The single active scenario = most recently created row. */
async function getActiveScenario() {
  const [rows] = await pool.query(
    `SELECT ${SCENARIO_COLUMNS} FROM manual_disaster_scenarios ORDER BY id DESC LIMIT 1`
  );
  return rows[0] || null;
}

async function getScenarioById(id) {
  const [rows] = await pool.query(
    `SELECT ${SCENARIO_COLUMNS} FROM manual_disaster_scenarios WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getScenarioByUid(uid) {
  const [rows] = await pool.query(
    `SELECT ${SCENARIO_COLUMNS} FROM manual_disaster_scenarios WHERE scenario_uid = ?`,
    [uid]
  );
  return rows[0] || null;
}

/** Scenario history, newest first. */
async function getScenarioHistory({ limit = 25, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ${SCENARIO_COLUMNS} FROM manual_disaster_scenarios
     ORDER BY id DESC LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );
  return rows;
}

async function countScenarios() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM manual_disaster_scenarios');
  return Number(rows[0].count);
}

// ------------------------------------------------------------
// Alerts derived from a scenario
// ------------------------------------------------------------

/**
 * Insert an alert for a scenario. `scenario_id` is UNIQUE in the table,
 * so re-running this for the same scenario (e.g. a page refresh that
 * re-reads the active scenario) cannot create a duplicate — the insert
 * is a no-op and the existing row is returned instead.
 */
async function insertScenarioAlert(alert) {
  const {
    scenario_id,
    scenario_uid,
    location_name,
    latitude,
    longitude,
    severity,
    title,
    message,
    recommended_action,
    probability,
  } = alert;

  const [result] = await pool.query(
    `INSERT INTO manual_scenario_alerts
       (scenario_id, scenario_uid, location_name, latitude, longitude,
        severity, title, message, recommended_action, probability, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [
      scenario_id,
      scenario_uid,
      location_name,
      latitude,
      longitude,
      severity,
      title,
      message,
      recommended_action,
      probability,
    ]
  );

  return result.insertId;
}

async function getAlertByScenarioId(scenarioId) {
  const [rows] = await pool.query(
    'SELECT * FROM manual_scenario_alerts WHERE scenario_id = ? LIMIT 1',
    [scenarioId]
  );
  return rows[0] || null;
}

async function getRecentScenarioAlerts({ limit = 25 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 200);
  const [rows] = await pool.query(
    'SELECT * FROM manual_scenario_alerts ORDER BY id DESC LIMIT ?',
    [safeLimit]
  );
  return rows;
}

async function updateScenarioAlertStatus(id, status) {
  const [result] = await pool.query(
    'UPDATE manual_scenario_alerts SET status = ? WHERE id = ?',
    [status, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  insertScenario,
  getActiveScenario,
  getScenarioById,
  getScenarioByUid,
  getScenarioHistory,
  countScenarios,
  insertScenarioAlert,
  getAlertByScenarioId,
  getRecentScenarioAlerts,
  updateScenarioAlertStatus,
};
