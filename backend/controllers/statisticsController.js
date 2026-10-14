const statisticsModel = require('../models/statisticsModel');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/statistics
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await statisticsModel.getDashboardStatistics();
  res.json({ success: true, data: stats });
});

module.exports = { getStatistics };
