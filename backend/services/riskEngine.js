const config = require('../config/riskConfig');

/**
 * Determines the risk level label for a given numeric score (0-100).
 */
function scoreToRiskLevel(score) {
  const { riskLevels } = config;
  if (score >= riskLevels.CRITICAL.min) return 'CRITICAL';
  if (score >= riskLevels.HIGH.min) return 'HIGH';
  if (score >= riskLevels.MODERATE.min) return 'MODERATE';
  return 'LOW';
}

/**
 * HYBRID RISK ENGINE
 * ------------------
 * final_score = ML prediction + rule-based safety adjustments
 *
 * This deliberately does NOT rely solely on the ML model: hard
 * physical-safety rules (extreme rainfall, saturated soil, rapid
 * river rise, steep unstable slopes, etc.) can push the score up
 * even if the ML model under-estimates risk, which matters for a
 * life-safety system with sparse historical training data.
 *
 * @param {object} features - the ML feature vector (see featureService)
 * @param {object} mlResult - { risk_score, confidence } from the ML service
 * @param {object} trend - { riverRise, rainfallIncrease3h } from featureService
 * @returns {{ risk_score:number, risk_level:string, confidence:number,
 *             ml_risk_score:number, rule_adjustment:number, triggeredRules:string[] }}
 */
function computeHybridRisk(features, mlResult, trend = {}) {
  const { thresholds, ruleWeights } = config;
  const { riverRise = 0, rainfallIncrease3h = 0 } = trend;

  let adjustment = 0;
  const triggeredRules = [];

  // Rule: extreme / high rainfall in the last hour
  if (features.rainfall_1h > thresholds.rainfall_1h_extreme) {
    adjustment += ruleWeights.extremeRainfall;
    triggeredRules.push('EXTREME_RAINFALL');
  } else if (features.rainfall_1h > thresholds.rainfall_1h_high) {
    adjustment += ruleWeights.highRainfall;
    triggeredRules.push('HIGH_RAINFALL');
  }

  // Rule: rapid rainfall increase (short-term spike)
  if (rainfallIncrease3h > thresholds.rainfall_3h_rapid_increase) {
    adjustment += ruleWeights.rapidRainfallIncrease;
    triggeredRules.push('RAPID_RAINFALL_INCREASE');
  }

  // Rule: soil saturation
  if (features.soil_moisture > thresholds.soil_moisture_saturation) {
    adjustment += ruleWeights.soilSaturation;
    triggeredRules.push('SOIL_SATURATION');
  } else if (features.soil_moisture > thresholds.soil_moisture_high) {
    adjustment += ruleWeights.highSoilMoisture;
    triggeredRules.push('HIGH_SOIL_MOISTURE');
  }

  // Rule: river level danger
  if (features.river_level > thresholds.river_level_danger) {
    adjustment += ruleWeights.riverDanger;
    triggeredRules.push('RIVER_DANGER_LEVEL');
  } else if (features.river_level > thresholds.river_level_high) {
    adjustment += ruleWeights.riverHigh;
    triggeredRules.push('RIVER_HIGH_LEVEL');
  }

  // Rule: rapid river rise
  if (riverRise > thresholds.river_level_rapid_rise) {
    adjustment += ruleWeights.riverRapidRise;
    triggeredRules.push('RAPID_RIVER_RISE');
  }

  // Rule: steep slope + high soil moisture combination (landslide-prone)
  if (features.slope > thresholds.slope_steep && features.soil_moisture > thresholds.soil_moisture_high) {
    adjustment += ruleWeights.steepSlopeHighMoisture;
    triggeredRules.push('STEEP_SLOPE_SATURATED_SOIL');
  }

  // Rule: high historical risk index for this location
  if (features.historical_risk > thresholds.historical_risk_high) {
    adjustment += ruleWeights.highHistoricalRisk;
    triggeredRules.push('HIGH_HISTORICAL_RISK');
  }

  const mlScore = Number(mlResult.risk_score) || 0;
  const rawFinalScore = mlScore + adjustment;
  const finalScore = Math.min(100, Math.max(0, Math.round(rawFinalScore * 100) / 100));

  return {
    risk_score: finalScore,
    risk_level: scoreToRiskLevel(finalScore),
    confidence: Number(mlResult.confidence) || 0.5,
    ml_risk_score: mlScore,
    rule_adjustment: Math.round(adjustment * 100) / 100,
    triggeredRules,
  };
}

module.exports = { computeHybridRisk, scoreToRiskLevel };
