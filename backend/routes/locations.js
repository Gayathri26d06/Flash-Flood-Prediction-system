const express = require('express');
const router = express.Router();
const controller = require('../controllers/locationController');
const { validateIdParam } = require('../middleware/validate');

// GET /api/locations
router.get('/', controller.getAllLocations);

// GET /api/locations/:id
router.get('/:id', validateIdParam('id'), controller.getLocationById);

module.exports = router;
