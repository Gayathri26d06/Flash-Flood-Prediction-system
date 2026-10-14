import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getEnvironment, createDynamicPrediction, getDynamicAlerts, getDynamicSafeZones } from '../services/api'

const LocationContext = createContext(null)

const STORAGE_KEY = 'ffps.activeLocation'

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(location) {
  try {
    if (location) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage may be unavailable (private mode, SSR, etc.) — non-fatal.
  }
}

/**
 * Global "Active Location" state used across every page
 * (Dashboard, Risk Map, Predictions, Alerts, Simulation, Evacuation).
 *
 * Selecting a location here fetches its environmental data and makes
 * it available everywhere via useActiveLocation(). Navigating between
 * routes does NOT reset this — it lives above the <Routes> tree.
 */
export function LocationProvider({ children }) {
  const [selectedLocation, setSelectedLocationState] = useState(() => loadPersisted())
  const [environmentalData, setEnvironmentalData] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [safeZones, setSafeZones] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadEverythingFor = useCallback(async (location) => {
    setLoading(true)
    setError(null)
    setEnvironmentalData(null)
    setPrediction(null)
    setAlerts([])
    setSafeZones([])

    try {
      const [envRes, predictionRes, alertsRes, zonesRes] = await Promise.all([
        getEnvironment(location.latitude, location.longitude),
        createDynamicPrediction(location.latitude, location.longitude, location.name),
        getDynamicAlerts(location.latitude, location.longitude, location.name),
        getDynamicSafeZones(location.latitude, location.longitude),
      ])

      if (envRes.success) setEnvironmentalData(envRes.data)
      else setError((prev) => prev || envRes.error)

      if (predictionRes.success) setPrediction(predictionRes.data)
      else setError((prev) => prev || predictionRes.error)

      if (alertsRes.success) setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : [])
      if (zonesRes.success) setSafeZones(Array.isArray(zonesRes.data) ? zonesRes.data : [])

      if (!envRes.success && !predictionRes.success) {
        setError(envRes.error || predictionRes.error || 'Could not load data for this location.')
      }
    } catch (err) {
      setError(err.message || 'Could not load data for this location.')
    } finally {
      setLoading(false)
    }
  }, [])

  const setSelectedLocation = useCallback(
    (location) => {
      // Expected shape: { name, address, latitude, longitude, district, state }
      setSelectedLocationState(location)
      persist(location)
      if (location) loadEverythingFor(location)
    },
    [loadEverythingFor]
  )

  const clearSelectedLocation = useCallback(() => {
    setSelectedLocationState(null)
    setEnvironmentalData(null)
    setPrediction(null)
    setAlerts([])
    setSafeZones([])
    setError(null)
    persist(null)
  }, [])

  const refresh = useCallback(() => {
    if (selectedLocation) loadEverythingFor(selectedLocation)
  }, [selectedLocation, loadEverythingFor])

  const value = useMemo(
    () => ({
      selectedLocation,
      latitude: selectedLocation?.latitude ?? null,
      longitude: selectedLocation?.longitude ?? null,
      locationName: selectedLocation?.name ?? null,
      address: selectedLocation?.address ?? null,
      environmentalData,
      prediction,
      alerts,
      safeZones,
      loading,
      error,
      hasActiveLocation: Boolean(selectedLocation),
      setSelectedLocation,
      clearSelectedLocation,
      refresh,
    }),
    [selectedLocation, environmentalData, prediction, alerts, safeZones, loading, error, setSelectedLocation, clearSelectedLocation, refresh]
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useActiveLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) {
    throw new Error('useActiveLocation must be used within a <LocationProvider>')
  }
  return ctx
}

export default LocationContext
