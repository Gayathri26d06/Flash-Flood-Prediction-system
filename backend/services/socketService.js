let ioInstance = null;

/** Called once from server.js after creating the Socket.IO server. */
function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Socket error on ${socket.id}:`, err.message);
    });
  });

  io.engine.on('connection_error', (err) => {
    console.error('[Socket.IO] Connection error:', err.message);
  });
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized yet. Call initSocket(io) first.');
  }
  return ioInstance;
}

/** Event: sensor_update — emitted whenever a new sensor reading is stored. */
function emitSensorUpdate(payload) {
  if (!ioInstance) return;
  ioInstance.emit('sensor_update', payload);
}

/** Event: prediction_update — emitted whenever a new prediction is computed. */
function emitPredictionUpdate(payload) {
  if (!ioInstance) return;
  ioInstance.emit('prediction_update', payload);
}

/** Event: new_alert — emitted whenever a new alert is generated. */
function emitNewAlert(payload) {
  if (!ioInstance) return;
  ioInstance.emit('new_alert', payload);
}

module.exports = {
  initSocket,
  getIO,
  emitSensorUpdate,
  emitPredictionUpdate,
  emitNewAlert,
};
