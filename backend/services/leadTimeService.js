const config = require('../config/riskConfig');

/**
 * PROTOTYPE lead-time estimator.
 *
 * IMPORTANT: This is a heuristic, illustrative estimate for the
 * hackathon prototype. It is NOT a validated, physically-modeled,
 * or operationally certified flood-forecast lead time. A real
 * deployment would require hydrological modeling, calibrated
 * against historical gauge/rainfall data per catchment.
 *
 * Approach: pick the base range for the risk level, then bias
 * within that range using rainfall intensity, river level and
 * soil moisture / trend signals (higher intensity => shorter
 * lead time, since the event is closer/faster-developing).
 */
function estimateLeadTimeMinutes({ risk_level, features, trend = {} }) {
  const range = config.leadTimeRangesMinutes[risk_level];
  if (!range || risk_level === 'LOW') return 0;

  const { riverRise = 0, rainfallIncrease3h = 0 } = trend;

  // Severity signal 0-1: how "extreme" conditions are within this risk band
  const rainfallSeverity = Math.min(1, (features.rainfall_1h || 0) / 150);
  const riverSeverity = Math.min(1, (features.river_level || 0) / 100);
  const soilSeverity = Math.min(1, (features.soil_moisture || 0) / 100);
  const trendSeverity = Math.min(1, (Math.max(riverRise, 0) + Math.max(rainfallIncrease3h, 0)) / 100);

  const severity = (rainfallSeverity * 0.35 + riverSeverity * 0.3 + soilSeverity * 0.2 + trendSeverity * 0.15);

  // Higher severity -> closer to the shorter end of the range (faster onset).
  const span = range.max - range.min;
  const leadTime = Math.round(range.max - severity * span);

  return Math.max(range.min, Math.min(range.max, leadTime));
}

module.exports = { estimateLeadTimeMinutes };
