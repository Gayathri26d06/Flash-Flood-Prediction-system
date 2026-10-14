import { useCallback, useEffect, useState } from 'react'
import { getSensors, getSensorsByLocation } from '../services/api'

/**
 * Fetches sensor data. Pass a locationId to scope to one location,
 * or omit it to fetch the full sensor network.
 */
export default function useSensors(locationId) {
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSensors = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = locationId ? await getSensorsByLocation(locationId) : await getSensors()
    if (res.success) {
      const data = res.data
      setSensors(Array.isArray(data) ? data : data ? [data] : [])
    } else {
      setError(res.error || 'Could not load sensor data.')
    }
    setLoading(false)
  }, [locationId])

  useEffect(() => {
    fetchSensors()
  }, [fetchSensors])

  /** Apply a live sensor_update payload, upserting by location_id. */
  const applyUpdate = useCallback((payload) => {
    setSensors((prev) => {
      const idx = prev.findIndex((s) => s.location_id === payload.location_id)
      if (idx === -1) return [payload, ...prev]
      const next = [...prev]
      next[idx] = { ...next[idx], ...payload }
      return next
    })
  }, [])

  return { sensors, loading, error, refetch: fetchSensors, applyUpdate }
}
