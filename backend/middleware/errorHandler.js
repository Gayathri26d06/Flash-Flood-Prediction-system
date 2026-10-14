const { MLServiceError } = require('../services/mlService');

/** Wrap async route handlers so thrown errors reach the error middleware. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 404 handler for unmatched routes. */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/** Central error-handling middleware — must be registered last. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.message);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // ML service specific handling
  if (err instanceof MLServiceError || err.name === 'MLServiceError') {
    const status = err.isTimeout ? 504 : err.isUnavailable ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: err.isUnavailable
        ? 'ML prediction service is currently unavailable. Please try again shortly.'
        : err.isTimeout
        ? 'ML prediction service timed out.'
        : `ML prediction service error: ${err.message}`,
    });
  }

  // MySQL errors
  if (err.code && String(err.code).startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      message: 'A database error occurred while processing the request.',
    });
  }

  // Validation errors (thrown with statusCode from validators)
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.publicMessage || err.message || 'Internal server error.',
  });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
