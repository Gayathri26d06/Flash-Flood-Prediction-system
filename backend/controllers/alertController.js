const alertModel = require('../models/alertModel');
const { asyncHandler } = require('../middleware/errorHandler');
const { emitNewAlert } = require('../services/socketService');
const dynamicPredictionService = require('../services/dynamicPredictionService');
const alertService = require('../services/alertService');
const manualScenarioModel = require('../models/manualScenarioModel');
const scenarioService = require('../services/scenarioService');

function serializeAlert(row) {
  return {
    id: row.id,
    location_id: row.location_id,
    location_name: row.location_name,
    district: row.district,
    state: row.state,
    severity: row.severity,
    message: row.message,
    risk_score: Number(row.risk_score),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /api/alerts — supports optional ?status= and ?location_id= filters
const getAllAlerts = asyncHandler(async (req, res) => {
  const { status, location_id } = req.query;
  const rows = await alertModel.getAllAlerts({
    status: status ? String(status).toUpperCase() : undefined,
    locationId: location_id,
  });
  res.json({ success: true, data: rows.map(serializeAlert) });
});

// POST /api/alerts — manually create an alert (e.g. admin/manual override)
const createAlert = asyncHandler(async (req, res) => {
  const { location_id, severity, message, risk_score = 0 } = req.body;

  const alertId = await alertModel.insertAlert({
    location_id,
    severity: String(severity).toUpperCase(),
    message,
    risk_score,
    status: 'ACTIVE',
  });

  const payload = {
    id: alertId,
    location_id: Number(location_id),
    severity: String(severity).toUpperCase(),
    risk_score: Number(risk_score),
    message,
    status: 'ACTIVE',
  };

  emitNewAlert(payload);
  res.status(201).json({ success: true, data: payload });
});

// PATCH /api/alerts/:id — update alert status (ACTIVE/ACKNOWLEDGED/RESOLVED)
const updateAlertStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const existing = await alertModel.getAlertById(id);
  if (!existing) {
    const err = new Error(`Alert with id ${id} not found.`);
    err.statusCode = 404;
    return next(err);
  }

  await alertModel.updateAlertStatus(id, String(status).toUpperCase());
  const updated = await alertModel.getAlertById(id);

  res.json({
    success: true,
    data: {
      id: updated.id,
      location_id: updated.location_id,
      severity: updated.severity,
      message: updated.message,
      risk_score: Number(updated.risk_score),
      status: updated.status,
      updated_at: updated.updated_at,
    },
  });
});

// GET /api/alerts/dynamic?lat=<lat>&lon=<lon>&location_name=<name>
// Generates alert-style guidance for an arbitrary searched location,
// derived live from the dynamic prediction pipeline. These are NOT
// persisted to the DB (no location_id to attach them to) — they are
// computed on demand so the Alerts page can stay location-specific.
const getDynamicAlerts = asyncHandler(async (req, res, next) => {
  const { lat, lon, location_name } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    const err = new Error('"lat" and "lon" query parameters are required and must be numbers.');
    err.statusCode = 400;
    return next(err);
  }

  const prediction = await dynamicPredictionService.runDynamicPredictionPipeline({
    lat: latitude,
    lon: longitude,
    locationName: location_name,
  });

  const RISK_ORDER = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };
  const isAlertWorthy = (RISK_ORDER[prediction.risk_level] ?? 0) >= RISK_ORDER.MODERATE;

  const alerts = isAlertWorthy
    ? [
        {
          id: `dynamic-${latitude}-${longitude}-${Date.now()}`,
          location_id: null,
          location_name: location_name || prediction.location_name || `${latitude}, ${longitude}`,
          latitude,
          longitude,
          severity: prediction.risk_level,
          risk_score: prediction.risk_score,
          message: alertService.buildAlertMessage({
            locationName: location_name || prediction.location_name || `${latitude}, ${longitude}`,
            riskScore: prediction.risk_score,
            riskLevel: prediction.risk_level,
            leadTimeMinutes: prediction.lead_time_minutes,
          }),
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          prediction_source: prediction.prediction_source,
          is_dynamic: true,
        },
      ]
    : [];

  res.json({
    success: true,
    data: alerts,
    meta: {
      location_name: location_name || prediction.location_name,
      latitude,
      longitude,
      risk_level: prediction.risk_level,
      risk_score: prediction.risk_score,
      prediction_source: prediction.prediction_source,
    },
  });
});

// GET /api/alerts/scenario — alerts auto-generated from manual AI Disaster
// Check scenarios. These live in `manual_scenario_alerts` rather than
// `alerts`, because a searched location has no row in `locations` to
// satisfy the alerts.location_id foreign key.
//
// Exactly one alert exists per scenario (enforced by a UNIQUE key on
// scenario_id), so refreshing the Alerts page never duplicates them.
const getScenarioAlerts = asyncHandler(async (req, res) => {
  const rows = await manualScenarioModel.getRecentScenarioAlerts({ limit: req.query.limit });
  res.json({ success: true, data: rows.map(scenarioService.serializeScenarioAlert) });
});

// PATCH /api/alerts/scenario/:id — acknowledge / resolve a scenario alert
const updateScenarioAlertStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const status = String(req.body.status || '').toUpperCase();

  if (!['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
    const err = new Error('"status" must be one of ACTIVE, ACKNOWLEDGED, RESOLVED.');
    err.statusCode = 400;
    return next(err);
  }

  const updated = await manualScenarioModel.updateScenarioAlertStatus(id, status);
  if (!updated) {
    const err = new Error(`Scenario alert with id ${id} not found.`);
    err.statusCode = 404;
    return next(err);
  }

  res.json({ success: true, data: { id: Number(id), status } });
});

module.exports = {
  getAllAlerts,
  createAlert,
  updateAlertStatus,
  getDynamicAlerts,
  getScenarioAlerts,
  updateScenarioAlertStatus,
};
