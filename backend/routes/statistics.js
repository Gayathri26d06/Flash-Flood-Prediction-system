const express = require('express');
const router = express.Router();
const controller = require('../controllers/statisticsController');

// GET /api/statistics
router.get('/', controller.getStatistics);

module.exports = router;
