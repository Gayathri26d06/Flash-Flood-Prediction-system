const { pool } = require('../config/db');

async function getAllAlerts({ status, locationId } = {}) {
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('a.status = ?');
    params.push(status);
  }
  if (locationId) {
    clauses.push('a.location_id = ?');
    params.push(locationId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT a.*, l.name AS location_name, l.district, l.state
     FROM alerts a
     INNER JOIN locations l ON l.id = a.location_id
     ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  return rows;
}

async function getAlertById(id) {
  const [rows] = await pool.query('SELECT * FROM alerts WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getLatestActiveAlertForLocation(locationId) {
  const [rows] = await pool.query(
    `SELECT * FROM alerts WHERE location_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
    [locationId]
  );
  return rows[0] || null;
}

async function insertAlert({ location_id, severity, message, risk_score, status = 'ACTIVE' }) {
  const [result] = await pool.query(
    `INSERT INTO alerts (location_id, severity, message, risk_score, status)
     VALUES (?, ?, ?, ?, ?)`,
    [location_id, severity, message, risk_score, status]
  );
  return result.insertId;
}

async function updateAlertStatus(id, status) {
  const [result] = await pool.query(
    `UPDATE alerts SET status = ? WHERE id = ?`,
    [status, id]
  );
  return result.affectedRows > 0;
}

async function countActiveAlerts() {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM alerts WHERE status = 'ACTIVE'`);
  return rows[0].count;
}

module.exports = {
  getAllAlerts,
  getAlertById,
  getLatestActiveAlertForLocation,
  insertAlert,
  updateAlertStatus,
  countActiveAlerts,
};
