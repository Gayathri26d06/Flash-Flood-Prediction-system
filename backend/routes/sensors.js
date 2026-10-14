const express = require('express');
const router = express.Router();
const controller = require('../controllers/sensorController');
const { validateIdParam } = require('../middleware/validate');

// GET /api/sensors
router.get('/', controller.getAllSensors);

// GET /api/sensors/:locationId
router.get('/:locationId', validateIdParam('locationId'), controller.getSensorByLocation);

module.exports = router;
