const express = require('express');
const router = express.Router();
const controller = require('../controllers/simulationController');
const { validateSimulationInput } = require('../middleware/validate');

// POST /api/simulation
router.post('/', validateSimulationInput, controller.runSimulation);

module.exports = router;
