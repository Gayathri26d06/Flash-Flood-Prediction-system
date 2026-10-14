const express = require('express');
const router = express.Router();
const controller = require('../controllers/locationSearchController');

// GET /api/location/search?q=<query>
router.get('/search', controller.searchLocations);

module.exports = router;
