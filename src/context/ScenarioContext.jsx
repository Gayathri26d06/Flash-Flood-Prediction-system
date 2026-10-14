import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  manualDisasterPrediction,
  getActiveScenario as fetchActiveScenario,
  getScenarioHistory as fetchScenarioHistory,
} from '../services/api'

const ScenarioContext = createContext(null)

const STORAGE_KEY = 'ffps.activeScenario'

/**
 * ACTIVE DISASTER SCENARIO — the single source of truth.
 * =====================================================
 * Created by the AI Disaster Check page, then consumed unchanged by:
 *
 *   Risk Map · AI Predictions · Alerts · Simulation · Evacuation
 *
 * No page derives its own copy of this data. That guarantees the
 * consistency requirement: if the user predicts HIGH risk for Munnar,
 * every module shows Munnar / HIGH. Predicting LOW for Kovilpatti
 * immediately replaces it everywhere.
 *
 * Persistence is two-layered:
 *   1. sessionStorage — instant restore on reload, no flash of empty state
 *   2. GET /api/predictions/active-scenario — authoritative, from MySQL
 *
 * The server always wins if the two disagree.
 */

function loadPersisted() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persist(scenario) {
  try {
    if (scenario) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(scenario))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // sessionStorage may be unavailable (private mode) — non-fatal.
  }
}

export function ScenarioProvider({ children }) {
  const [scenario, setScenario] = useState(() => loadPersisted())
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [error, setError] = useState(null)
  // Set when the prediction ran but MySQL could not store it.
  const [persistenceWarning, setPersistenceWarning] = useState(null)

  /** Re-read the authoritative scenario from the backend. */
  const refreshScenario = useCallback(async () => {
    const res = await fetchActiveScenario()
    if (res.success) {
      // data may legitimately be null (no scenario has been run yet).
      setScenario(res.data || null)
      persist(res.data || null)
      return res.data || null
    }
    // Backend unreachable: keep whatever the session already had rather
    // than blanking every module.
    return null
  }, [])

  const refreshHistory = useCallback(async (limit = 20) => {
    const res = await fetchScenarioHistory(limit)
    if (res.success) setHistory(Array.isArray(res.data) ? res.data : [])
    return res
  }, [])

  // Hydrate once on app start.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await refreshScenario()
      await refreshHistory()
      if (!cancelled) setHydrating(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshScenario, refreshHistory])

  /**
   * Run the AI Disaster Check. On success the returned scenario becomes
   * active for the whole application.
   *
   * @param {object} location    { name, latitude, longitude, district, state, country, address }
   * @param {object} environment { rainfall, temperature, humidity, soil_moisture }
   */
  const runDisasterCheck = useCallback(
    async (location, environment) => {
      setLoading(true)
      setError(null)
      setPersistenceWarning(null)

      if (!location || !location.name || location.latitude == null || location.longitude == null) {
        const message = 'Please select a location before running AI Disaster Check.'
        setError(message)
        setLoading(false)
        return { success: false, error: message }
      }

      const res = await manualDisasterPrediction({ location, ...environment })
      setLoading(false)

      if (!res.success) {
        setError(res.error || 'Prediction failed. Please try again.')
        return res
      }

      setScenario(res.data)
      persist(res.data)

      if (res.meta && res.meta.persisted === false) {
        setPersistenceWarning(res.meta.database_error)
      } else {
        // Only refresh history when the scenario actually reached the DB.
        refreshHistory()
      }

      return res
    },
    [refreshHistory]
  )

  const clearScenario = useCallback(() => {
    setScenario(null)
    setError(null)
    setPersistenceWarning(null)
    persist(null)
  }, [])

  const value = useMemo(() => {
    const riskLevel = scenario?.prediction?.risk_level ?? null

    return {
      scenario,
      history,
      loading,
      hydrating,
      error,
      persistenceWarning,

      hasActiveScenario: Boolean(scenario),

      // Flattened conveniences so pages don't repeat optional chaining.
      scenarioLocation: scenario?.location ?? null,
      scenarioEnvironment: scenario?.environment ?? null,
      scenarioPrediction: scenario?.prediction ?? null,
      scenarioAlert: scenario?.alert ?? null,
      scenarioEvacuation: scenario?.evacuation ?? null,
      riskLevel,
      probability: scenario?.prediction?.probability ?? null,
      isDisaster: scenario?.prediction?.disaster ?? null,
      recommendedAction: scenario?.recommended_action ?? null,
      timestamp: scenario?.created_at ?? null,

      runDisasterCheck,
      refreshScenario,
      refreshHistory,
      clearScenario,
    }
  }, [
    scenario,
    history,
    loading,
    hydrating,
    error,
    persistenceWarning,
    runDisasterCheck,
    refreshScenario,
    refreshHistory,
    clearScenario,
  ])

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useActiveScenario() {
  const ctx = useContext(ScenarioContext)
  if (!ctx) {
    throw new Error('useActiveScenario must be used within a <ScenarioProvider>')
  }
  return ctx
}

export default ScenarioContext
