const crypto = require('crypto');
const manualScenarioModel = require('../models/manualScenarioModel');
const { emitNewAlert } = require('./socketService');

/**
 * ACTIVE DISASTER SCENARIO
 * ========================
 * A scenario is created every time the user runs an AI Disaster Check
 * with an active location. The newest scenario is "active" and becomes
 * the single source of truth for:
 *
 *   Risk Map · AI Predictions · Alerts · Simulation · Evacuation
 *
 * This service owns the shape of that object so no module has to
 * re-derive it, and so every module renders exactly the same numbers.
 */

const RISK_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };

const ALERT_TITLES = {
  LOW: 'FLOOD RISK ADVISORY',
  MODERATE: 'FLOOD WARNING',
  HIGH: 'HIGH RISK FLOOD ALERT',
  CRITICAL: 'CRITICAL FLOOD ALERT',
};

const RECOMMENDED_ACTIONS = {
  LOW: 'No emergency action required. Continue routine monitoring of rainfall and river levels.',
  MODERATE: 'Stay alert. Avoid unnecessary travel near riverbanks, culverts and steep slopes.',
  HIGH: 'Prepare for possible evacuation and monitor alerts. Keep emergency kits and documents ready.',
  CRITICAL: 'Evacuate to the nearest designated safe zone immediately. Avoid river channels and low-lying roads.',
};

/**
 * Evacuation posture derived from the scenario risk level.
 * Deliberately conservative at the low end: a LOW-risk scenario must
 * never trigger an emergency evacuation recommendation (spec §11).
 */
const EVACUATION_STATUS = {
  LOW: {
    status: 'NOT REQUIRED',
    detail: 'Conditions do not warrant evacuation. Routine monitoring is sufficient.',
  },
  MODERATE: {
    status: 'MONITOR',
    detail: 'No evacuation ordered. Identify your nearest safe zone and keep monitoring conditions.',
  },
  HIGH: {
    status: 'PREPARE',
    detail: 'Prepare to evacuate. Confirm your route to the nearest safe zone and stay ready to move.',
  },
  CRITICAL: {
    status: 'RECOMMENDED',
    detail: 'Evacuation recommended now. Move to the nearest safe zone by the highest-ground route available.',
  },
};

function normalizeRiskLevel(level) {
  const upper = String(level || '').trim().toUpperCase();
  return RISK_ORDER[upper] !== undefined ? upper : 'LOW';
}

function recommendedAction(riskLevel) {
  return RECOMMENDED_ACTIONS[normalizeRiskLevel(riskLevel)];
}

function evacuationGuidance(riskLevel) {
  return EVACUATION_STATUS[normalizeRiskLevel(riskLevel)];
}

/** MODERATE and above produce an emergency-style alert; LOW is informational. */
function isAlertWorthy(riskLevel) {
  return RISK_ORDER[normalizeRiskLevel(riskLevel)] >= RISK_ORDER.MODERATE;
}

function buildScenarioAlertMessage({ locationName, state, riskLevel, probability, environment }) {
  const level = normalizeRiskLevel(riskLevel);
  const place = [locationName, state].filter(Boolean).join(', ');

  return [
    ALERT_TITLES[level],
    '',
    `Location: ${place}`,
    `Risk Level: ${level}`,
    `Disaster Probability: ${Number(probability).toFixed(1)}%`,
    '',
    `Rainfall: ${environment.rainfall} mm`,
    `Humidity: ${environment.humidity} %`,
    `Soil Moisture: ${environment.soil_moisture} %`,
    `Temperature: ${environment.temperature} °C`,
    '',
    level === 'LOW'
      ? 'Environmental conditions do not currently indicate elevated flash flood risk.'
      : 'Environmental conditions indicate elevated flash flood risk.',
    '',
    'Recommended Action:',
    RECOMMENDED_ACTIONS[level],
  ].join('\n');
}

/**
 * Convert a DB row into the canonical API scenario object.
 * Every module consumes exactly this shape.
 */
function serializeScenario(row, alertRow = null) {
  if (!row) return null;

  const riskLevel = normalizeRiskLevel(row.risk_level);

  return {
    scenario_id: row.id,
    scenario_uid: row.scenario_uid,

    location: {
      name: row.location_name,
      district: row.district || null,
      state: row.state || null,
      country: row.country || null,
      address: row.address || null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },

    environment: {
      rainfall: Number(row.rainfall),
      temperature: Number(row.temperature),
      humidity: Number(row.humidity),
      soil_moisture: Number(row.soil_moisture),
    },

    prediction: {
      disaster: Boolean(row.disaster),
      prediction: row.prediction,
      probability: Number(row.probability),
      risk_level: riskLevel,
      message: row.message,
      model_source: row.model_source || 'Prototype Random Forest classifier',
      // The probability above is the prototype classifier's confidence on a
      // synthetic training distribution — not a validated flood probability.
      is_validated_forecast: false,
    },

    alert: alertRow ? serializeScenarioAlert(alertRow) : null,

    evacuation: {
      ...evacuationGuidance(riskLevel),
      risk_level: riskLevel,
    },

    recommended_action: recommendedAction(riskLevel),
    created_at: row.created_at,
    timestamp: row.created_at,
  };
}

function serializeScenarioAlert(row) {
  if (!row) return null;
  return {
    id: row.id,
    scenario_id: row.scenario_id,
    scenario_uid: row.scenario_uid,
    location_name: row.location_name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    severity: row.severity,
    risk_level: row.severity,
    title: row.title,
    message: row.message,
    recommended_action: row.recommended_action,
    probability: Number(row.probability),
    risk_score: Number(row.probability),
    status: row.status,
    created_at: row.created_at,
    source: 'MANUAL_SCENARIO',
  };
}

/**
 * Persist a scenario + (if warranted) its alert, inside one logical unit.
 *
 * Alert de-duplication: the alert row is keyed on the scenario id, which
 * is unique per prediction run, so refreshing any page can never spawn a
 * second alert for the same scenario (spec §9).
 */
async function createScenario({ location, environment, prediction }) {
  const scenarioUid = crypto.randomUUID();
  const riskLevel = normalizeRiskLevel(prediction.risk_level);

  const scenarioId = await manualScenarioModel.insertScenario({
    scenario_uid: scenarioUid,
    location_name: location.name,
    district: location.district ?? null,
    state: location.state ?? null,
    country: location.country ?? null,
    address: location.address ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
    rainfall: environment.rainfall,
    temperature: environment.temperature,
    humidity: environment.humidity,
    soil_moisture: environment.soil_moisture,
    disaster: prediction.disaster,
    prediction: prediction.prediction,
    probability: prediction.probability,
    risk_level: riskLevel,
    message: prediction.message,
    model_source: prediction.model_source,
  });

  let alertRow = null;

  if (isAlertWorthy(riskLevel)) {
    const message = buildScenarioAlertMessage({
      locationName: location.name,
      state: location.state,
      riskLevel,
      probability: prediction.probability,
      environment,
    });

    const alertId = await manualScenarioModel.insertScenarioAlert({
      scenario_id: scenarioId,
      scenario_uid: scenarioUid,
      location_name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      severity: riskLevel,
      title: ALERT_TITLES[riskLevel],
      message,
      recommended_action: RECOMMENDED_ACTIONS[riskLevel],
      probability: prediction.probability,
    });

    alertRow = await manualScenarioModel.getAlertByScenarioId(scenarioId);

    console.log(
      `[SCENARIO ALERT] ${riskLevel} alert #${alertId} generated for "${location.name}" ` +
        `(probability: ${prediction.probability}%)`
    );

    // Simulated notification channel — DB record above + Socket.IO broadcast.
    emitNewAlert(serializeScenarioAlert(alertRow));
  }

  const row = await manualScenarioModel.getScenarioById(scenarioId);
  return serializeScenario(row, alertRow);
}

/** The current active scenario, with its alert attached. */
async function getActiveScenario() {
  const row = await manualScenarioModel.getActiveScenario();
  if (!row) return null;
  const alertRow = await manualScenarioModel.getAlertByScenarioId(row.id);
  return serializeScenario(row, alertRow);
}

/** Compact history entries for the history API / UI table. */
async function getScenarioHistory({ limit, offset } = {}) {
  const rows = await manualScenarioModel.getScenarioHistory({ limit, offset });
  const total = await manualScenarioModel.countScenarios();

  const data = rows.map((row) => ({
    scenario_id: row.id,
    scenario_uid: row.scenario_uid,
    location_name: row.location_name,
    state: row.state || null,
    country: row.country || null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    rainfall: Number(row.rainfall),
    temperature: Number(row.temperature),
    humidity: Number(row.humidity),
    soil_moisture: Number(row.soil_moisture),
    disaster: Boolean(row.disaster),
    prediction: row.prediction,
    probability: Number(row.probability),
    risk_level: normalizeRiskLevel(row.risk_level),
    created_at: row.created_at,
  }));

  return { data, total };
}

module.exports = {
  createScenario,
  getActiveScenario,
  getScenarioHistory,
  serializeScenario,
  serializeScenarioAlert,
  buildScenarioAlertMessage,
  recommendedAction,
  evacuationGuidance,
  isAlertWorthy,
  normalizeRiskLevel,
  ALERT_TITLES,
  RECOMMENDED_ACTIONS,
};
