const locationModel = require('../models/locationModel');
const { asyncHandler } = require('../middleware/errorHandler');

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  err.publicMessage = message;
  return err;
}

function serializeLocation(row) {
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    state: row.state,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    elevation: Number(row.elevation),
    slope: Number(row.slope),
    population: row.population,
    historical_risk: Number(row.historical_risk),
    is_demo_data: Boolean(row.is_demo_data),
    risk_score: row.risk_score !== null && row.risk_score !== undefined ? Number(row.risk_score) : null,
    risk_level: row.risk_level || 'UNKNOWN',
    confidence: row.confidence !== null && row.confidence !== undefined ? Number(row.confidence) : null,
    lead_time: row.lead_time !== null && row.lead_time !== undefined ? Number(row.lead_time) : null,
  };
}

// GET /api/locations
const getAllLocations = asyncHandler(async (req, res) => {
  const rows = await locationModel.getAllLocations();
  res.json({ success: true, data: rows.map(serializeLocation) });
});

// GET /api/locations/:id
const getLocationById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const row = await locationModel.getLocationById(id);
  if (!row) {
    return next(notFound(`Location with id ${id} not found.`));
  }
  res.json({ success: true, data: serializeLocation(row) });
});

module.exports = { getAllLocations, getLocationById };
