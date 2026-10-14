import axios from 'axios'
import * as mock from './mockData'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// DEV-ONLY: when true and the real backend is unreachable, API calls below
// fall back to services/mockData.js so the UI is demoable standalone.
// Set VITE_USE_MOCK_DATA=false (or delete this block + mockData.js) once
// the backend team's endpoints are live. See services/mockData.js.
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK_DATA).toLowerCase() === 'true'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Normalize every response into { success, data, error }
// so pages never have to special-case axios errors vs backend errors.
async function request(promise) {
  try {
    const res = await promise
    return res.data
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Request failed. Please try again.'
    return { success: false, data: null, error: message, status: err.response?.status ?? 0 }
  }
}

// MOCK FALLBACK helper — see banner above and services/mockData.js
async function withMockFallback(promise, mockData) {
  const res = await request(promise)
  if (!res.success && USE_MOCK) {
    return { success: true, data: mockData, error: null, _mock: true }
  }
  return res
}

// ---- Locations ----
export const getLocations = () => withMockFallback(apiClient.get('/locations'), mock.MOCK_LOCATIONS)
export const getLocationById = (id) =>
  withMockFallback(
    apiClient.get(`/locations/${id}`),
    mock.MOCK_LOCATIONS.find((l) => String(l.id) === String(id))
  )

// ---- Sensors ----
export const getSensors = () => withMockFallback(apiClient.get('/sensors'), mock.MOCK_SENSORS)
export const getSensorsByLocation = (locationId) =>
  withMockFallback(
    apiClient.get(`/sensors/${locationId}`),
    mock.MOCK_SENSORS.find((s) => String(s.location_id) === String(locationId))
  )

// ---- Predictions ----
export const getPredictions = () => withMockFallback(apiClient.get('/predictions'), mock.MOCK_PREDICTIONS)
export const createPrediction = (payload) => request(apiClient.post('/predictions', payload))


// ---- Manual AI disaster check / ACTIVE DISASTER SCENARIO ----
// POST body: { location: { name, latitude, longitude, district, state, country, address },
//              rainfall, temperature, humidity, soil_moisture }
// Returns the complete scenario, which becomes the single source of truth
// for the Risk Map, AI Predictions, Alerts, Simulation and Evacuation pages.
export const manualDisasterPrediction = (payload) =>
  request(apiClient.post('/predictions/manual-disaster', payload))

// The latest scenario, re-read on app load so a refresh keeps every module in sync.
export const getActiveScenario = () => request(apiClient.get('/predictions/active-scenario'))

// Previous scenarios — retained forever, newest first.
export const getScenarioHistory = (limit = 20) =>
  request(apiClient.get('/predictions/history', { params: { limit } }))

// Alerts auto-generated from manual scenarios.
export const getScenarioAlerts = (limit = 20) =>
  request(apiClient.get('/alerts/scenario', { params: { limit } }))

export const updateScenarioAlertStatus = (id, status) =>
  request(apiClient.patch(`/alerts/scenario/${id}`, { status }))

// ---- Alerts ----
export const getAlerts = () => withMockFallback(apiClient.get('/alerts'), mock.MOCK_ALERTS)
export const createAlert = (payload) => request(apiClient.post('/alerts', payload))
export const updateAlertStatus = (id, payload) => request(apiClient.patch(`/alerts/${id}`, payload))

// ---- Simulation ----
export const runSimulation = (payload) => request(apiClient.post('/simulation', payload))

// ---- Statistics ----
export const getStatistics = () => withMockFallback(apiClient.get('/statistics'), mock.MOCK_STATISTICS)

// ---- Safe zones ----
export const getSafeZones = () => withMockFallback(apiClient.get('/safe-zones'), mock.MOCK_SAFE_ZONES)
export const getDynamicSafeZones = (lat, lon) =>
  request(apiClient.get('/safe-zones/dynamic', { params: { lat, lon } }))

// ---- Global location search (geocoding) ----
// Supports ANY location, not just the seeded demo villages above.
export const searchLocationsByName = (query) =>
  request(apiClient.get('/location/search', { params: { q: query } }))

// ---- Live environmental data for arbitrary coordinates ----
export const getEnvironment = (lat, lon) =>
  request(apiClient.get('/environment', { params: { lat, lon } }))

// ---- Dynamic (location-search-driven) predictions ----
export const createDynamicPrediction = (lat, lon, locationName, overrides = null) =>
  request(apiClient.post('/predictions/dynamic', { lat, lon, location_name: locationName, overrides }))

// ---- Dynamic alerts for the active searched location ----
export const getDynamicAlerts = (lat, lon, locationName) =>
  request(apiClient.get('/alerts/dynamic', { params: { lat, lon, location_name: locationName } }))

export default {
  getLocations,
  getLocationById,
  getSensors,
  getSensorsByLocation,
  getPredictions,
  createPrediction,
  manualDisasterPrediction,
  getActiveScenario,
  getScenarioHistory,
  getScenarioAlerts,
  updateScenarioAlertStatus,
  getAlerts,
  createAlert,
  updateAlertStatus,
  runSimulation,
  getStatistics,
  getSafeZones,
  getDynamicSafeZones,
  searchLocationsByName,
  getEnvironment,
  createDynamicPrediction,
  getDynamicAlerts,
}
