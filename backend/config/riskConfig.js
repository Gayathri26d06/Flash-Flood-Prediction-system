/**
 * Configurable thresholds for the hybrid rule-based risk engine.
 * Tweak these values to tune sensitivity without touching the
 * engine logic itself.
 *
 * All rainfall figures are in mm for the given window; soil
 * moisture, humidity and river_level are percentages (0-100).
 */
module.exports = {
  thresholds: {
    rainfall_1h_extreme: 80,      // mm in the last hour
    rainfall_1h_high: 50,
    rainfall_3h_rapid_increase: 60, // mm increase over 3h considered "rapid"
    soil_moisture_saturation: 85,   // percent
    soil_moisture_high: 70,
    river_level_danger: 80,         // percent of danger mark
    river_level_high: 60,
    river_level_rapid_rise: 20,     // percent rise between consecutive readings
    slope_steep: 30,                // degrees
    historical_risk_high: 0.75,     // 0-1 scale
  },

  // Points added to the ML risk score when a rule condition fires.
  ruleWeights: {
    extremeRainfall: 15,
    highRainfall: 8,
    rapidRainfallIncrease: 10,
    soilSaturation: 12,
    highSoilMoisture: 6,
    riverDanger: 15,
    riverHigh: 7,
    riverRapidRise: 10,
    steepSlopeHighMoisture: 12,
    highHistoricalRisk: 8,
  },

  riskLevels: {
    LOW: { min: 0, max: 30 },
    MODERATE: { min: 31, max: 60 },
    HIGH: { min: 61, max: 80 },
    CRITICAL: { min: 81, max: 100 },
  },

  // Prototype lead-time ranges (minutes) used when the ML service
  // does not supply one directly. NOT a validated operational forecast.
  leadTimeRangesMinutes: {
    CRITICAL: { min: 20, max: 45 },
    HIGH: { min: 30, max: 90 },
    MODERATE: { min: 60, max: 180 },
    LOW: { min: 0, max: 0 },
  },
};
