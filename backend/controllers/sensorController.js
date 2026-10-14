const sensorModel = require('../models/sensorModel');
const { asyncHandler } = require('../middleware/errorHandler');

function serializeSensor(row) {
  return {
    location_id: row.location_id,
    rainfall: Number(row.rainfall),
    soil_moisture: Number(row.soil_moisture),
    river_level: Number(row.river_level),
    humidity: Number(row.humidity),
    temperature: Number(row.temperature),
    is_synthetic: Boolean(row.is_synthetic),
    timestamp: row.timestamp,
  };
}

// GET /api/sensors — latest reading for every location
const getAllSensors = asyncHandler(async (req, res) => {
  const rows = await sensorModel.getAllLatestSensorData();
  res.json({ success: true, data: rows.map(serializeSensor) });
});

// GET /api/sensors/:locationId — latest reading for a single location
const getSensorByLocation = asyncHandler(async (req, res, next) => {
  const { locationId } = req.params;
  const row = await sensorModel.getLatestSensorDataByLocation(locationId);
  if (!row) {
    const err = new Error(`No sensor data found for location ${locationId}.`);
    err.statusCode = 404;
    return next(err);
  }
  res.json({ success: true, data: serializeSensor(row) });
});

module.exports = { getAllSensors, getSensorByLocation };
