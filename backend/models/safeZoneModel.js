const { pool } = require('../config/db');

async function getAllSafeZones() {
  const [rows] = await pool.query(`
    SELECT sz.*, l.name AS location_name
    FROM safe_zones sz
    INNER JOIN locations l ON l.id = sz.location_id
    ORDER BY sz.id ASC
  `);
  return rows;
}

async function getSafeZonesByLocation(locationId) {
  const [rows] = await pool.query(
    'SELECT * FROM safe_zones WHERE location_id = ? ORDER BY id ASC',
    [locationId]
  );
  return rows;
}

module.exports = { getAllSafeZones, getSafeZonesByLocation };
