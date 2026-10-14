const { getRecentSensorHistory } = require('../models/sensorModel');
const { getLocationById } = require('../models/locationModel');

/**
 * Builds the exact feature vector expected by the ML model from:
 *  - the current/latest sensor reading
 *  - recent sensor history (to derive rainfall_3h/6h/24h and trends)
 *  - static location attributes (slope, elevation, historical_risk)
 *
 * If insufficient history exists (e.g. a fresh demo DB), rainfall
 * window aggregates fall back to a reasonable multiple of the
 * current reading so the pipeline still produces a sensible result.
 */
async function buildFeatureVector(locationId, currentReading) {
  const location = await getLocationById(locationId);
  if (!location) {
    throw new Error(`Location ${locationId} not found while building features.`);
  }

  const history = await getRecentSensorHistory(locationId, 50); // most recent first

  const rainfall_1h = Number(currentReading.rainfall);

  // Sum rainfall across however much history we have, as a proxy for
  // multi-hour accumulation windows (readings arrive every few seconds
  // during simulation, representing accelerated time).
  const sumRainfall = (n) =>
    history.slice(0, n).reduce((sum, r) => sum + Number(r.rainfall), 0) || rainfall_1h;

  const rainfall_3h = Math.max(rainfall_1h, sumRainfall(3));
  const rainfall_6h = Math.max(rainfall_3h, sumRainfall(6));
  const rainfall_24h = Math.max(rainfall_6h, sumRainfall(24));

  return {
    rainfall_1h,
    rainfall_3h,
    rainfall_6h,
    rainfall_24h,
    soil_moisture: Number(currentReading.soil_moisture),
    river_level: Number(currentReading.river_level),
    humidity: Number(currentReading.humidity),
    temperature: Number(currentReading.temperature),
    slope: Number(location.slope),
    elevation: Number(location.elevation),
    historical_risk: Number(location.historical_risk),
  };
}

/**
 * Returns { previousReading, riverRise, rainfallTrend } to support
 * "rapid increase" rule checks in the risk engine.
 */
async function getTrendContext(locationId, currentReading) {
  const history = await getRecentSensorHistory(locationId, 2);
  const previousReading = history.length > 1 ? history[1] : null;

  if (!previousReading) {
    return { riverRise: 0, rainfallIncrease3h: 0 };
  }

  const riverRise = Number(currentReading.river_level) - Number(previousReading.river_level);
  const rainfallIncrease3h = Number(currentReading.rainfall) - Number(previousReading.rainfall);

  return { riverRise, rainfallIncrease3h };
}

module.exports = { buildFeatureVector, getTrendContext };
