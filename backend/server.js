require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { testConnection } = require('./config/db');
const { initSocket } = require('./services/socketService');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const mlService = require('./services/mlService');

// Routes
const locationsRouter = require('./routes/locations');
const sensorsRouter = require('./routes/sensors');
const predictionsRouter = require('./routes/predictions');
const alertsRouter = require('./routes/alerts');
const simulationRouter = require('./routes/simulation');
const statisticsRouter = require('./routes/statistics');
const safeZonesRouter = require('./routes/safeZones');
// Location-controlled intelligence system additions: global location
// search (geocoding) + live environmental data for arbitrary coordinates.
const locationSearchRouter = require('./routes/locationSearch');
const environmentRouter = require('./routes/environment');

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH'],
  },
});
initSocket(io);

// ------------------------------------------------------------
// Global middleware
// ------------------------------------------------------------
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// ------------------------------------------------------------
// Health check (system-level, not the ML /health endpoint)
// ------------------------------------------------------------
app.get('/health', async (req, res) => {
  const mlHealth = await mlService.checkHealth();
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'flood-prediction-backend',
      timestamp: new Date().toISOString(),
      ml_service: mlHealth,
    },
  });
});

// ------------------------------------------------------------
// API routes
// ------------------------------------------------------------
app.use('/api/locations', locationsRouter);
app.use('/api/sensors', sensorsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/safe-zones', safeZonesRouter);
app.use('/api/location', locationSearchRouter);
app.use('/api/environment', environmentRouter);

// ------------------------------------------------------------
// 404 + error handling (must be last)
// ------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------------------------------
// Startup
// ------------------------------------------------------------
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.warn('[Startup] Continuing to start server despite DB connection issue. Fix .env and MySQL before using the API.');
  }

  server.listen(PORT, () => {
    console.log('==============================================================');
    console.log(' AI-Based Hyper-Local Flash Flood Prediction System — Backend');
    console.log('==============================================================');
    console.log(`  HTTP + Socket.IO server listening on port ${PORT}`);
    console.log(`  ML service expected at: ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
    console.log('==============================================================');
  });
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Shutdown] SIGINT received, closing server...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM received, closing server...');
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };
