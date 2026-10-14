import { io } from 'socket.io-client'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

// A single shared socket instance for the whole app.
// Connection is lazy (autoConnect: false) and started by useRealtimeData
// so we don't open a socket before anything is listening.
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 8000,
})

export const SOCKET_EVENTS = {
  SENSOR_UPDATE: 'sensor_update',
  PREDICTION_UPDATE: 'prediction_update',
  NEW_ALERT: 'new_alert',
}

export function connectSocket() {
  if (!socket.connected) socket.connect()
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect()
}

export default socket
