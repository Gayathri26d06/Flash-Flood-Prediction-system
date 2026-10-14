const environmentService = require('../services/environmentService');
const { asyncHandler } = require('../middleware/errorHandler');

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.publicMessage = message;
  return err;
}

function parseCoords(req) {
  const { lat, lon } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (lat === undefined || lon === undefined || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

// GET /api/environment?lat=<lat>&lon=<lon>
const getEnvironment = asyncHandler(async (req, res, next) => {
  const coords = parseCoords(req);
  if (!coords) {
    return next(badRequest('Valid "lat" and "lon" query parameters are required.'));
  }

  const data = await environmentService.getEnvironmentalData(coords.latitude, coords.longitude);
  res.json({ success: true, data });
});

module.exports = { getEnvironment, parseCoords, badRequest };
