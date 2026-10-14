const predictionModel = require('../models/predictionModel');
const sensorModel = require('../models/sensorModel');
const predictionService = require('../services/predictionService');
const dynamicPredictionService = require('../services/dynamicPredictionService');
const mlService = require('../services/mlService');
const scenarioService = require('../services/scenarioService');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/predictions — latest prediction per location
const getAllPredictions = asyncHandler(async (req, res) => {
  const rows = await predictionModel.getAllLatestPredictions();
  const data = rows.map((r) => ({
    location_id: r.location_id,
    location_name: r.location_name,
    district: r.district,
    state: r.state,
    risk_score: Number(r.risk_score),
    risk_level: r.risk_level,
    confidence: Number(r.confidence),
    lead_time: Number(r.lead_time),
    prediction_time: r.prediction_time,
  }));
  res.json({ success: true, data });
});

// POST /api/predictions — run the pipeline for a location using its latest sensor reading
const createPrediction = asyncHandler(async (req, res, next) => {
  const { location_id } = req.body;

  const latestReading = await sensorModel.getLatestSensorDataByLocation(location_id);
  if (!latestReading) {
    const err = new Error(`No sensor data available for location ${location_id}. Cannot generate a prediction.`);
    err.statusCode = 422;
    return next(err);
  }

  const result = await predictionService.runPredictionPipeline(location_id, latestReading);
  res.status(201).json({ success: true, data: result });
});

// POST /api/predictions/dynamic — run the pipeline for an arbitrary
// searched location (lat/lon), using live environmental data instead
// of the seeded sensor DB. Used by the global location search feature.
const createDynamicPrediction = asyncHandler(async (req, res, next) => {
  const { lat, lon, location_name, overrides } = req.body;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    const err = new Error('"lat" and "lon" are required and must be numbers.');
    err.statusCode = 400;
    return next(err);
  }

  const result = await dynamicPredictionService.runDynamicPredictionPipeline({
    lat: latitude,
    lon: longitude,
    locationName: location_name,
    overrides: overrides && typeof overrides === 'object' ? overrides : null,
  });

  res.status(201).json({ success: true, data: result });
});


// ------------------------------------------------------------
// MANUAL AI DISASTER CHECK — the central scenario source.
//
// Flow: Frontend -> Backend (validate) -> FastAPI ML -> MySQL
//       -> alert generation -> complete scenario back to Frontend.
//
// The scenario written here becomes the ACTIVE SCENARIO consumed by
// the Risk Map, AI Predictions, Alerts, Simulation and Evacuation
// modules, so all of them always show the same location and numbers.
// ------------------------------------------------------------

const ENV_RANGES = {
  rainfall: { min: 0, max: 1000, unit: 'mm', label: 'Rainfall' },
  temperature: { min: -50, max: 60, unit: '°C', label: 'Temperature' },
  humidity: { min: 0, max: 100, unit: '%', label: 'Humidity' },
  soil_moisture: { min: 0, max: 100, unit: '%', label: 'Soil moisture' },
};

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/** Validate + normalize the four manually entered environmental values. */
function parseEnvironment(body) {
  const missing = Object.keys(ENV_RANGES).filter((key) => {
    const value = body[key];
    return value === undefined || value === null || value === '';
  });

  if (missing.length) {
    throw badRequest(`Missing required field(s): ${missing.join(', ')}`);
  }

  const numeric = {};
  for (const [key, range] of Object.entries(ENV_RANGES)) {
    const value = Number(body[key]);
    if (!Number.isFinite(value)) {
      throw badRequest(`${range.label} must be a number.`);
    }
    if (value < range.min || value > range.max) {
      throw badRequest(`${range.label} must be between ${range.min} and ${range.max} ${range.unit}.`);
    }
    numeric[key] = value;
  }

  return numeric;
}

/**
 * Validate the active location that the scenario will be attached to.
 * A scenario without a location cannot drive the Risk Map or Evacuation
 * modules, so the location is required here (spec §15).
 */
function parseLocation(body) {
  const raw = body.location && typeof body.location === 'object' ? body.location : body;

  const name = raw.name ?? raw.location_name;
  const latitude = Number(raw.latitude ?? raw.lat);
  const longitude = Number(raw.longitude ?? raw.lon ?? raw.lng);

  if (!name || !String(name).trim()) {
    throw badRequest('Please select a location before running AI Disaster Check.');
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw badRequest('Please select a location before running AI Disaster Check.');
  }
  if (latitude < -90 || latitude > 90) {
    throw badRequest('Latitude must be between -90 and 90.');
  }
  if (longitude < -180 || longitude > 180) {
    throw badRequest('Longitude must be between -180 and 180.');
  }

  const trim = (value, max) =>
    value === undefined || value === null || value === '' ? null : String(value).slice(0, max);

  return {
    name: String(name).trim().slice(0, 191),
    district: trim(raw.district, 150),
    state: trim(raw.state, 100),
    country: trim(raw.country, 100),
    address: trim(raw.address ?? raw.display_name, 512),
    latitude,
    longitude,
  };
}

// POST /api/predictions/manual-disaster
const manualDisasterPrediction = asyncHandler(async (req, res, next) => {
  let environment;
  let location;

  try {
    environment = parseEnvironment(req.body);
    location = parseLocation(req.body);
  } catch (validationError) {
    return next(validationError);
  }

  // 1-3. Call the FastAPI ML service. An MLServiceError propagates to the
  // error handler, which maps it to 503/504 with a friendly message.
  const prediction = await mlService.getManualDisasterPrediction(environment);

  // 4-6. Persist the scenario and generate its alert. If MySQL is down we
  // still return the prediction so the UI is usable, but we say clearly
  // that it was not stored and could not become the active scenario.
  try {
    const scenario = await scenarioService.createScenario({ location, environment, prediction });

    return res.status(201).json({
      success: true,
      data: scenario,
      meta: { persisted: true },
    });
  } catch (dbError) {
    console.error('[manual-disaster] Failed to persist scenario:', dbError.message);

    return res.status(200).json({
      success: true,
      data: {
        scenario_id: null,
        scenario_uid: null,
        location,
        environment,
        prediction: {
          disaster: Boolean(prediction.disaster),
          prediction: prediction.prediction,
          probability: Number(prediction.probability),
          risk_level: scenarioService.normalizeRiskLevel(prediction.risk_level),
          message: prediction.message,
          model_source: prediction.model_source,
          is_validated_forecast: false,
        },
        alert: null,
        evacuation: {
          ...scenarioService.evacuationGuidance(prediction.risk_level),
          risk_level: scenarioService.normalizeRiskLevel(prediction.risk_level),
        },
        recommended_action: scenarioService.recommendedAction(prediction.risk_level),
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
      meta: {
        persisted: false,
        database_error:
          'The prediction succeeded but could not be saved: the database is unavailable. ' +
          'This scenario will not appear in history and will be lost on refresh.',
      },
    });
  }
});

// GET /api/predictions/active-scenario — the current source of truth
const getActiveScenario = asyncHandler(async (req, res) => {
  const scenario = await scenarioService.getActiveScenario();

  if (!scenario) {
    return res.json({
      success: true,
      data: null,
      message: 'No active disaster scenario yet. Run an AI Disaster Check to create one.',
    });
  }

  res.json({ success: true, data: scenario });
});

// GET /api/predictions/history — previous scenarios (never deleted)
const getScenarioHistory = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const { data, total } = await scenarioService.getScenarioHistory({ limit, offset });
  res.json({ success: true, data, meta: { total, count: data.length } });
});

module.exports = {
  getAllPredictions,
  createPrediction,
  createDynamicPrediction,
  manualDisasterPrediction,
  getActiveScenario,
  getScenarioHistory,
};
