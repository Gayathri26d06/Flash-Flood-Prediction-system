const environmentService = require('./environmentService');
const mlService = require('./mlService');
const riskEngine = require('./riskEngine');
const leadTimeService = require('./leadTimeService');

// Reasonable, clearly-labelled defaults used only when a value cannot be
// derived from any real source (e.g. slope/elevation for a location that
// isn't in the seeded locations DB). These do NOT represent real terrain
// survey data.
const DEFAULT_SLOPE_DEGREES = 12;
const DEFAULT_ELEVATION_METERS = 100;
const DEFAULT_HISTORICAL_RISK = 0.35;

/**
 * Builds the ML feature vector for an arbitrary lat/lon using live
 * environmental data instead of DB sensor history. Rainfall window
 * aggregates (3h/6h/24h) are approximated from the single current
 * reading, since we don't have historical sensor data for arbitrary
 * searched locations.
 */
function buildFeaturesFromEnvironment(env) {
  const rainfall_1h = Number(env.weather.rainfall ?? env.weather.precipitation ?? 0) || 0;
  const soil_moisture = Number(env.soil.soil_moisture ?? 0) || 0;
  const humidity = Number(env.weather.humidity ?? 0) || 0;
  const temperature = Number(env.weather.temperature ?? 0) || 0;

  // river_level is intentionally NOT available (no official CWC feed).
  // We use river_discharge, normalized into a rough 0-100 "pressure"
  // proxy ONLY for internal risk-engine math — it is still reported to
  // the client separately and distinctly as river_discharge, never
  // mislabeled as river_level.
  const discharge = env.river.river_discharge;
  const dischargeProxy = discharge !== null && discharge !== undefined
    ? Math.min(100, Math.round((discharge / 500) * 100))
    : 0;

  return {
    rainfall_1h,
    rainfall_3h: rainfall_1h * 2.2,
    rainfall_6h: rainfall_1h * 3.5,
    rainfall_24h: rainfall_1h * 6,
    soil_moisture,
    river_level: dischargeProxy, // internal proxy only, see note above
    humidity,
    temperature,
    slope: DEFAULT_SLOPE_DEGREES,
    elevation: DEFAULT_ELEVATION_METERS,
    historical_risk: DEFAULT_HISTORICAL_RISK,
  };
}

/**
 * Deterministic, rule-based fallback scorer used ONLY when the Python
 * ML service is unreachable. Clearly labelled to the client as
 * "Prototype Fallback" — never presented as an actual ML prediction.
 */
function fallbackMlResult(features) {
  let score = 0;
  score += Math.min(40, (features.rainfall_1h / 100) * 40);
  score += Math.min(25, (features.soil_moisture / 100) * 25);
  score += Math.min(20, (features.river_level / 100) * 20);
  score += Math.min(15, (features.humidity / 100) * 15);
  score = Math.round(Math.min(100, score) * 100) / 100;

  return {
    risk_score: score,
    confidence: 0.55, // deliberately modest — this is a heuristic, not a trained model
    lead_time_minutes: null,
  };
}

/**
 * Runs the full dynamic prediction pipeline for an arbitrary searched
 * location: environmental data -> feature vector -> ML (or fallback)
 * -> hybrid rule-based risk engine -> lead time.
 */
async function runDynamicPredictionPipeline({ lat, lon, locationName, overrides = null }) {
  const env = await environmentService.getEnvironmentalData(lat, lon);

  // Allow the Simulation page to override live-fetched values with
  // hypothetical scenario inputs (rainfall/soil moisture/etc.) while
  // still anchoring the scenario to the active location's coordinates
  // and its real river-discharge/data-source context.
  if (overrides) {
    if (overrides.rainfall !== undefined) env.weather.rainfall = Number(overrides.rainfall);
    if (overrides.temperature !== undefined) env.weather.temperature = Number(overrides.temperature);
    if (overrides.humidity !== undefined) env.weather.humidity = Number(overrides.humidity);
    if (overrides.soil_moisture !== undefined) env.soil.soil_moisture = Number(overrides.soil_moisture);
  }

  const features = buildFeaturesFromEnvironment(env);
  if (overrides && overrides.river_level !== undefined) {
    features.river_level = Number(overrides.river_level);
  }

  let mlResult;
  let predictionSource = 'ML Model';
  let mlError = null;

  try {
    mlResult = await mlService.getPrediction(features);
  } catch (err) {
    mlError = err.message;
    predictionSource = 'Prototype Fallback';
    mlResult = fallbackMlResult(features);
  }

  const hybrid = riskEngine.computeHybridRisk(features, mlResult, {});

  const leadTimeMinutes = mlResult.lead_time_minutes ?? leadTimeService.estimateLeadTimeMinutes({
    risk_level: hybrid.risk_level,
    features,
    trend: {},
  });

  return {
    location_name: locationName || null,
    latitude: Number(lat),
    longitude: Number(lon),
    risk_score: hybrid.risk_score,
    risk_level: hybrid.risk_level,
    confidence: hybrid.confidence,
    lead_time_minutes: leadTimeMinutes,
    triggered_rules: hybrid.triggeredRules,
    prediction_source: predictionSource,
    ml_service_error: mlError,
    environmental_factors: {
      rainfall_1h: features.rainfall_1h,
      soil_moisture: features.soil_moisture,
      humidity: features.humidity,
      temperature: features.temperature,
      river_discharge: env.river.river_discharge,
      river_level: env.river.river_level, // always null, see environmentService
    },
    environment: env,
  };
}

module.exports = { runDynamicPredictionPipeline, buildFeaturesFromEnvironment, fallbackMlResult };
