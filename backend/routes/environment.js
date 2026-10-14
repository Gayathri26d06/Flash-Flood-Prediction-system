const express = require('express');
const router = express.Router();
const controller = require('../controllers/environmentController');

// GET /api/environment?lat=<lat>&lon=<lon>
router.get('/', controller.getEnvironment);

module.exports = router;
