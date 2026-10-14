function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.publicMessage = message;
  return err;
}

/** Ensures :id / :locationId route params are positive integers. */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!/^\d+$/.test(value)) {
      return next(badRequest(`Invalid ${paramName}: must be a positive integer.`));
    }
    next();
  };
}

const SENSOR_FIELDS = ['rainfall', 'soil_moisture', 'river_level', 'humidity', 'temperature'];

function validateSimulationInput(req, res, next) {
  const body = req.body || {};

  if (!body.location_id || !/^\d+$/.test(String(body.location_id))) {
    return next(badRequest('location_id is required and must be a positive integer.'));
  }
  if (!body.scenario || typeof body.scenario !== 'string') {
    return next(badRequest('scenario is required and must be a string.'));
  }

  const allowedScenarios = ['NORMAL', 'HEAVY_RAIN', 'EXTREME_RAIN', 'RIVER_RISE', 'CRITICAL'];
  if (!allowedScenarios.includes(body.scenario.toUpperCase())) {
    return next(badRequest(`scenario must be one of: ${allowedScenarios.join(', ')}`));
  }

  for (const field of SENSOR_FIELDS) {
    if (body[field] === undefined || body[field] === null || isNaN(Number(body[field]))) {
      return next(badRequest(`${field} is required and must be a number.`));
    }
  }

  next();
}

function validatePredictionInput(req, res, next) {
  const body = req.body || {};
  if (!body.location_id || !/^\d+$/.test(String(body.location_id))) {
    return next(badRequest('location_id is required and must be a positive integer.'));
  }
  next();
}

function validateAlertInput(req, res, next) {
  const body = req.body || {};
  if (!body.location_id || !/^\d+$/.test(String(body.location_id))) {
    return next(badRequest('location_id is required and must be a positive integer.'));
  }
  if (!body.severity || !['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(String(body.severity).toUpperCase())) {
    return next(badRequest('severity is required and must be one of LOW, MODERATE, HIGH, CRITICAL.'));
  }
  if (!body.message || typeof body.message !== 'string') {
    return next(badRequest('message is required and must be a string.'));
  }
  next();
}

function validateAlertStatusPatch(req, res, next) {
  const body = req.body || {};
  if (!body.status || !['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].includes(String(body.status).toUpperCase())) {
    return next(badRequest('status is required and must be one of ACTIVE, ACKNOWLEDGED, RESOLVED.'));
  }
  next();
}

module.exports = {
  badRequest,
  validateIdParam,
  validateSimulationInput,
  validatePredictionInput,
  validateAlertInput,
  validateAlertStatusPatch,
};
