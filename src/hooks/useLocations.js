import { useCallback, useEffect, useState } from 'react'
import { getLocations } from '../services/api'

/**
 * Fetches the monitored-locations list and exposes loading/error state
 * plus a manual refetch (used by retry buttons and after simulations).
 */
export default function useLocations() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getLocations()
    if (res.success) {
      setLocations(Array.isArray(res.data) ? res.data : [])
    } else {
      setError(res.error || 'Could not load locations.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  /** Merge a partial update (e.g. from a prediction_update socket event) by id. */
  const patchLocation = useCallback((id, patch) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id || loc.location_id === id ? { ...loc, ...patch } : loc))
    )
  }, [])

  return { locations, loading, error, refetch: fetchLocations, patchLocation }
}
