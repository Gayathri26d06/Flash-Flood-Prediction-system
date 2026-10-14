const mlService = require('./mlService');
const riskEngine = require('./riskEngine');
const leadTimeService = require('./leadTimeService');
const featureService = require('./featureService');
const alertService = require('./alertService');
const predictionModel = require('../models/predictionModel');
const locationModel = require('../models/locationModel');
const { emitPredictionUpdate } = require('./socketService');

/**
 * Full pipeline: sensor reading -> features -> ML -> hybrid risk engine
 * -> lead time -> persist -> alert (if escalation) -> Socket.IO emit.
 *
 * Used by both POST /api/predictions (manual/scheduled trigger) and
 * POST /api/simulation (scenario-driven trigger).
 */
async function runPredictionPipeline(locationId, currentReading) {
  const location = await locationModel.getLocationById(locationId);
  if (!location) {
    const err = new Error(`Location ${locationId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const previousPrediction = await predictionModel.getLatestPredictionByLocation(locationId);
  const previousRiskLevel = previousPrediction ? previousPrediction.risk_level : 'LOW';
  const previousRiskScore = previousPrediction ? Number(previousPrediction.risk_score) : 0;

  const features = await featureService.buildFeatureVector(locationId, currentReading);
  const trend = await featureService.getTrendContext(locationId, currentReading);

  let mlResult;
  try {
    mlResult = await mlService.getPrediction(features);
  } catch (err) {
    // Bubble up a clear, typed error — controller decides HTTP response.
    throw err;
  }

  const hybrid = riskEngine.computeHybridRisk(features, mlResult, trend);

  const leadTimeMinutes = mlResult.lead_time_minutes ?? leadTimeService.estimateLeadTimeMinutes({
    risk_level: hybrid.risk_level,
    features,
    trend,
  });

  await predictionModel.insertPrediction({
    location_id: locationId,
    risk_score: hybrid.risk_score,
    risk_level: hybrid.risk_level,
    lead_time: leadTimeMinutes,
    confidence: hybrid.confidence,
    ml_risk_score: hybrid.ml_risk_score,
    rule_adjustment: hybrid.rule_adjustment,
  });

  const predictionPayload = {
    location_id: locationId,
    risk_score: hybrid.risk_score,
    risk_level: hybrid.risk_level,
    confidence: hybrid.confidence,
    lead_time_minutes: leadTimeMinutes,
  };

  emitPredictionUpdate(predictionPayload);

  const alert = await alertService.maybeGenerateAlert({
    location,
    previousRiskLevel,
    riskScore: hybrid.risk_score,
    riskLevel: hybrid.risk_level,
    leadTimeMinutes,
  });

  return {
    previous_risk_score: previousRiskScore,
    risk_score: hybrid.risk_score,
    risk_level: hybrid.risk_level,
    confidence: hybrid.confidence,
    lead_time_minutes: leadTimeMinutes,
    triggered_rules: hybrid.triggeredRules,
    alert_generated: Boolean(alert),
    alert,
  };
}

module.exports = { runPredictionPipeline };
