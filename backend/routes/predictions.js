const express = require('express');
const router = express.Router();
const controller = require('../controllers/predictionController');
const { validatePredictionInput } = require('../middleware/validate');

// GET /api/predictions
router.get('/', controller.getAllPredictions);

// POST /api/predictions
router.post('/', validatePredictionInput, controller.createPrediction);

// GET /api/predictions/active-scenario — the single active manual scenario.
// Declared before any '/:param' style routes so it is never shadowed.
router.get('/active-scenario', controller.getActiveScenario);

// GET /api/predictions/history — manual scenario history (newest first)
router.get('/history', controller.getScenarioHistory);

// POST /api/predictions/manual-disaster — AI Disaster Check.
// Creates the ACTIVE DISASTER SCENARIO consumed by every other module.
router.post('/manual-disaster', controller.manualDisasterPrediction);

// POST /api/predictions/dynamic — arbitrary searched location (lat/lon based)
router.post('/dynamic', controller.createDynamicPrediction);

module.exports = router;
