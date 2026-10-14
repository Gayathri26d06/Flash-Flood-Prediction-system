const sensorModel = require('../models/sensorModel');
const locationModel = require('../models/locationModel');
const predictionService = require('../services/predictionService');
const { asyncHandler } = require('../middleware/errorHandler');
const { emitSensorUpdate } = require('../services/socketService');

/**
 * POST /api/simulation
 *
 * Pipeline:
 *  1. Receive input (location_id, scenario, sensor values)
 *  2. Update sensor data (insert new reading, marked synthetic)
 *  3. Call ML service (via predictionService)
 *  4. Apply hybrid risk engine (via predictionService)
 *  5. Store prediction (via predictionService)
 *  6. Generate alert if required (via predictionService)
 *  7. Emit Socket.IO events: sensor_update, prediction_update, new_alert
 *  8. Return final combined result
 */
const runSimulation = asyncHandler(async (req, res, next) => {
  const { location_id, scenario, rainfall, soil_moisture, river_level, humidity, temperature } = req.body;

  const location = await locationModel.getLocationById(location_id);
  if (!location) {
    const err = new Error(`Location with id ${location_id} not found.`);
    err.statusCode = 404;
    return next(err);
  }

  // Step 2: persist the simulated sensor reading
  await sensorModel.insertSensorReading({
    location_id,
    rainfall,
    soil_moisture,
    river_level,
    humidity,
    temperature,
    is_synthetic: true,
  });

  const newReading = await sensorModel.getLatestSensorDataByLocation(location_id);

  const sensorPayload = {
    location_id: Number(location_id),
    rainfall: Number(rainfall),
    soil_moisture: Number(soil_moisture),
    river_level: Number(river_level),
    humidity: Number(humidity),
    temperature: Number(temperature),
    timestamp: newReading.timestamp,
  };
  emitSensorUpdate(sensorPayload);

  // Steps 3-7 handled by the shared prediction pipeline
  const result = await predictionService.runPredictionPipeline(location_id, newReading);

  // Step 8
  res.json({
    success: true,
    data: {
      scenario: String(scenario).toUpperCase(),
      previous_risk_score: result.previous_risk_score,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      lead_time_minutes: result.lead_time_minutes,
      alert_generated: result.alert_generated,
    },
  });
});

module.exports = { runSimulation };
