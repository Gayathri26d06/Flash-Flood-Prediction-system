const express = require('express');
const router = express.Router();
const controller = require('../controllers/safeZoneController');

// GET /api/safe-zones
router.get('/', controller.getAllSafeZones);

// GET /api/safe-zones/dynamic?lat=&lon= — arbitrary searched location
router.get('/dynamic', controller.getDynamicSafeZones);

module.exports = router;
