const geoService = require('../services/geoService');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/location/search?q=<query>
const searchLocations = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q || !String(q).trim()) {
    const err = new Error('Query parameter "q" is required, e.g. /api/location/search?q=Munnar');
    err.statusCode = 400;
    return next(err);
  }

  try {
    const results = await geoService.searchLocations(String(q).trim());
    res.json({ success: true, data: results });
  } catch (err) {
    if (err.isUnavailable) {
      err.statusCode = 503;
      err.publicMessage = 'Location search service is temporarily unavailable. Please try again shortly.';
    }
    return next(err);
  }
});

module.exports = { searchLocations };
