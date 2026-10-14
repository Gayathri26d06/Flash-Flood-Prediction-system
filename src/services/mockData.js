// ============================================================================
// DEV-ONLY MOCK DATA
// ----------------------------------------------------------------------------
// This file exists purely so the frontend can be demoed / developed before
// the backend (Node/Express + Python ML service, owned by the backend
// developer) is running. It is NOT part of the production data path.
//
// It activates ONLY when VITE_USE_MOCK_DATA=true in .env, and ONLY as a
// fallback when a real API call fails (see services/api.js). Once the real
// backend is available, delete this file and remove the fallback branches
// in services/api.js — search for "MOCK FALLBACK" there.
// ============================================================================

export const MOCK_LOCATIONS = [
  {
    id: 1,
    name: 'Devalsari',
    district: 'Tehri Garhwal',
    latitude: 30.35,
    longitude: 78.45,
    risk_score: 22,
    risk_level: 'LOW',
    rainfall: 12,
    soil_moisture: 38,
    river_level: 30,
    slope: 28,
    historical_risk: 'Low',
    lead_time_minutes: null,
  },
  {
    id: 2,
    name: 'Ghansali',
    district: 'Tehri Garhwal',
    latitude: 30.48,
    longitude: 78.75,
    risk_score: 48,
    risk_level: 'MODERATE',
    rainfall: 46,
    soil_moisture: 58,
    river_level: 52,
    slope: 34,
    historical_risk: 'Moderate',
    lead_time_minutes: 110,
  },
  {
    id: 3,
    name: 'Chamoli Ward 4',
    district: 'Chamoli',
    latitude: 30.4,
    longitude: 79.32,
    risk_score: 68,
    risk_level: 'HIGH',
    rainfall: 71,
    soil_moisture: 74,
    river_level: 66,
    slope: 41,
    historical_risk: 'High',
    lead_time_minutes: 58,
  },
  {
    id: 4,
    name: 'Rudraprayag Basin',
    district: 'Rudraprayag',
    latitude: 30.28,
    longitude: 78.98,
    risk_score: 90,
    risk_level: 'CRITICAL',
    rainfall: 96,
    soil_moisture: 88,
    river_level: 91,
    slope: 47,
    historical_risk: 'Critical',
    lead_time_minutes: 22,
  },
  {
    id: 5,
    name: 'Joshimath Sector 2',
    district: 'Chamoli',
    latitude: 30.55,
    longitude: 79.57,
    risk_score: 35,
    risk_level: 'MODERATE',
    rainfall: 33,
    soil_moisture: 49,
    river_level: 40,
    slope: 39,
    historical_risk: 'Moderate',
    lead_time_minutes: 140,
  },
]

export const MOCK_SENSORS = MOCK_LOCATIONS.map((loc, i) => ({
  sensor_id: `SNS-0${i + 1}`,
  location_id: loc.id,
  location_name: loc.name,
  rainfall: loc.rainfall,
  soil_moisture: loc.soil_moisture,
  river_level: loc.river_level,
  humidity: 60 + i * 5,
  temperature: 22 - i,
  status: loc.risk_level === 'CRITICAL' ? 'DEGRADED' : 'ONLINE',
  timestamp: new Date(Date.now() - i * 60000).toISOString(),
}))

export const MOCK_PREDICTIONS = MOCK_LOCATIONS.map((loc) => ({
  location_id: loc.id,
  location_name: loc.name,
  risk_score: loc.risk_score,
  risk_level: loc.risk_level,
  confidence: 0.8 + (loc.risk_score % 10) / 100,
  lead_time_minutes: loc.lead_time_minutes,
  prediction_time: new Date().toISOString(),
  factors: [
    { label: 'Heavy Rainfall', weight: 35 },
    { label: 'Soil Saturation', weight: 25 },
    { label: 'River Level', weight: 20 },
    { label: 'Steep Slope', weight: 12 },
    { label: 'Historical Risk', weight: 8 },
  ],
}))

export const MOCK_ALERTS = [
  {
    id: 101,
    location_id: 4,
    location_name: 'Rudraprayag Basin',
    severity: 'CRITICAL',
    risk_score: 90,
    message: 'River level rising rapidly; flash flood likely within the hour.',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 100,
    location_id: 3,
    location_name: 'Chamoli Ward 4',
    severity: 'HIGH',
    risk_score: 68,
    message: 'Soil saturation crossed threshold after sustained rainfall.',
    created_at: new Date(Date.now() - 40 * 60000).toISOString(),
    status: 'ACKNOWLEDGED',
  },
  {
    id: 99,
    location_id: 2,
    location_name: 'Ghansali',
    severity: 'MODERATE',
    risk_score: 48,
    message: 'Rainfall trending upward; continue monitoring.',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: 'RESOLVED',
  },
]

export const MOCK_SAFE_ZONES = [
  {
    id: 'sz-1',
    name: 'Rudraprayag Govt. Inter College',
    latitude: 30.31,
    longitude: 78.98,
    distance: 3.2,
    capacity: 400,
    availability: 260,
  },
  {
    id: 'sz-2',
    name: 'Community Hall, Agastyamuni',
    latitude: 30.35,
    longitude: 79.02,
    distance: 6.8,
    capacity: 220,
    availability: 150,
  },
]

export const MOCK_STATISTICS = {
  monitored_locations: MOCK_LOCATIONS.length,
  active_alerts: MOCK_ALERTS.filter((a) => a.status === 'ACTIVE').length,
  critical_locations: MOCK_LOCATIONS.filter((l) => l.risk_level === 'CRITICAL').length,
  active_sensors: MOCK_SENSORS.filter((s) => s.status !== 'OFFLINE').length,
  average_risk: Math.round(
    MOCK_LOCATIONS.reduce((sum, l) => sum + l.risk_score, 0) / MOCK_LOCATIONS.length
  ),
  system_status: 'OPERATIONAL',
}
