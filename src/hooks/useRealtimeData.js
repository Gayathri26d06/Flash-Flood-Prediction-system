import { useEffect, useRef, useState } from 'react'
import socket, { connectSocket, disconnectSocket, SOCKET_EVENTS } from '../services/socket'

/**
 * Central real-time hook. Opens (and keeps open) the shared Socket.IO
 * connection for as long as any mounted component needs it, exposes the
 * live connection status, and lets callers subscribe to specific events
 * without each page managing its own socket lifecycle.
 *
 * Usage:
 *   const { connected } = useRealtimeData({
 *     sensor_update: (payload) => ...,
 *     prediction_update: (payload) => ...,
 *     new_alert: (payload) => ...,
 *   })
 */
export default function useRealtimeData(handlers = {}) {
  const [connected, setConnected] = useState(socket.connected)
  const [lastEventAt, setLastEventAt] = useState(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    connectSocket()

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onConnectError = () => setConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    const wrap = (fn) => (payload) => {
      setLastEventAt(Date.now())
      fn?.(payload)
    }

    const onSensorUpdate = wrap((p) => handlersRef.current[SOCKET_EVENTS.SENSOR_UPDATE]?.(p))
    const onPredictionUpdate = wrap((p) =>
      handlersRef.current[SOCKET_EVENTS.PREDICTION_UPDATE]?.(p)
    )
    const onNewAlert = wrap((p) => handlersRef.current[SOCKET_EVENTS.NEW_ALERT]?.(p))

    socket.on(SOCKET_EVENTS.SENSOR_UPDATE, onSensorUpdate)
    socket.on(SOCKET_EVENTS.PREDICTION_UPDATE, onPredictionUpdate)
    socket.on(SOCKET_EVENTS.NEW_ALERT, onNewAlert)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off(SOCKET_EVENTS.SENSOR_UPDATE, onSensorUpdate)
      socket.off(SOCKET_EVENTS.PREDICTION_UPDATE, onPredictionUpdate)
      socket.off(SOCKET_EVENTS.NEW_ALERT, onNewAlert)
      // Note: we intentionally do not disconnect the shared socket here —
      // other mounted pages/components may still depend on it. See App.jsx
      // for the one place we tear it down (there we don't, by design;
      // the browser tab closing / navigating away ends the connection).
    }
  }, [])

  return { connected, lastEventAt, disconnect: disconnectSocket }
}
