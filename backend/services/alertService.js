const alertModel = require('../models/alertModel');
const { emitNewAlert } = require('./socketService');

const RISK_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };

/**
 * An alert-worthy transition is any escalation to MODERATE or above,
 * per spec: LOW -> MODERATE, MODERATE -> HIGH, HIGH -> CRITICAL
 * (and by extension any upward jump, e.g. LOW -> CRITICAL during a
 * fast-moving simulated scenario).
 */
function isEscalation(previousLevel, newLevel) {
  const prevRank = RISK_ORDER[previousLevel] ?? 0;
  const newRank = RISK_ORDER[newLevel] ?? 0;
  return newRank > prevRank && newRank >= RISK_ORDER.MODERATE;
}

function recommendedAction(riskLevel) {
  switch (riskLevel) {
    case 'CRITICAL':
      return 'Move to designated safe zones immediately. Avoid river channels, steep slopes and low-lying roads.';
    case 'HIGH':
      return 'Prepare to evacuate. Keep emergency kits ready and monitor official updates closely.';
    case 'MODERATE':
      return 'Stay alert. Avoid unnecessary travel near riverbanks and steep slopes.';
    default:
      return 'No immediate action required. Continue routine monitoring.';
  }
}

function buildAlertMessage({ locationName, riskScore, riskLevel, leadTimeMinutes }) {
  const header = riskLevel === 'CRITICAL' ? 'CRITICAL FLASH FLOOD WARNING' : `${riskLevel} FLASH FLOOD ALERT`;
  const leadTimeLine = leadTimeMinutes > 0
    ? `Estimated Lead Time: ${leadTimeMinutes} minutes`
    : 'Estimated Lead Time: Not applicable';

  return [
    header,
    '',
    `Location: ${locationName}`,
    `Risk Score: ${riskScore}/100`,
    leadTimeLine,
    '',
    'Recommended Action:',
    recommendedAction(riskLevel),
  ].join('\n');
}

/**
 * Generates and persists an alert if the risk level escalated,
 * then emits it via Socket.IO and logs it (simulated notification
 * channel — no paid SMS/push integration per project scope).
 *
 * @returns {object|null} the created alert record, or null if no alert was warranted.
 */
async function maybeGenerateAlert({ location, previousRiskLevel, riskScore, riskLevel, leadTimeMinutes }) {
  if (!isEscalation(previousRiskLevel, riskLevel)) {
    return null;
  }

  const message = buildAlertMessage({
    locationName: location.name,
    riskScore,
    riskLevel,
    leadTimeMinutes,
  });

  const alertId = await alertModel.insertAlert({
    location_id: location.id,
    severity: riskLevel,
    message,
    risk_score: riskScore,
    status: 'ACTIVE',
  });

  const alertPayload = {
    id: alertId,
    location_id: location.id,
    severity: riskLevel,
    risk_score: riskScore,
    message,
    status: 'ACTIVE',
  };

  // Simulated notification channels: DB record (above) + Socket.IO + log
  console.log(`[ALERT] ${riskLevel} alert generated for "${location.name}" (score: ${riskScore})`);
  emitNewAlert(alertPayload);

  return alertPayload;
}

module.exports = { maybeGenerateAlert, isEscalation, buildAlertMessage, recommendedAction };
