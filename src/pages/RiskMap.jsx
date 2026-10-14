import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { X } from 'lucide-react'
import FloodMap from '../maps/FloodMap'
import RiskBadge from '../components/RiskBadge'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import ActiveLocationPanel from '../components/ActiveLocationPanel'
import ActiveScenarioCard from '../components/ActiveScenarioCard'
import useLocations from '../hooks/useLocations'
import useRealtimeData from '../hooks/useRealtimeData'
import { useActiveLocation } from '../context/LocationContext'
import { useActiveScenario } from '../context/ScenarioContext'
import { formatLeadTime, riskLevelFromScore } from '../utils/riskUtils'

const FILTERS = ['All', 'Low', 'Moderate', 'High', 'Critical']

export default function RiskMap() {
  const { locations, loading, error, refetch, patchLocation } = useLocations()
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [searchParams] = useSearchParams()
  const { selectedLocation: activeLocation, prediction: activePrediction } = useActiveLocation()
  const { scenario, scenarioLocation, scenarioEnvironment, scenarioPrediction } = useActiveScenario()

  // Marker precedence:
  //   1. ACTIVE DISASTER SCENARIO (manual AI Disaster Check) — authoritative
  //   2. the globally searched active location + its live dynamic prediction
  //   3. nothing extra; the map behaves exactly as it did before
  //
  // When a scenario exists the map centers on it and shows its risk level,
  // probability and the environmental values the user actually entered, so
  // the Risk Map can never disagree with AI Predictions or Alerts.
  const activeAsMapLocation = scenario
    ? {
        id: 'active-scenario',
        name: scenarioLocation.name,
        district: [scenarioLocation.district, scenarioLocation.state].filter(Boolean).join(', '),
        latitude: scenarioLocation.latitude,
        longitude: scenarioLocation.longitude,
        risk_score: Math.round(scenarioPrediction.probability),
        risk_level: scenarioPrediction.risk_level,
        rainfall: scenarioEnvironment.rainfall,
        soil_moisture: scenarioEnvironment.soil_moisture,
        humidity: scenarioEnvironment.humidity,
        temperature: scenarioEnvironment.temperature,
        probability: scenarioPrediction.probability,
        prediction_label: scenarioPrediction.prediction,
        is_scenario: true,
      }
    : activeLocation
    ? {
        id: 'active-location',
        name: activeLocation.name,
        district: [activeLocation.district, activeLocation.state].filter(Boolean).join(', '),
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
        risk_score: activePrediction?.risk_score,
        risk_level: activePrediction?.risk_level,
        lead_time_minutes: activePrediction?.lead_time_minutes,
        rainfall: activePrediction?.environmental_factors?.rainfall_1h,
        soil_moisture: activePrediction?.environmental_factors?.soil_moisture,
      }
    : null

  useEffect(() => {
    if (activeAsMapLocation) setSelected(activeAsMapLocation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scenario?.scenario_id,
    activeLocation?.latitude,
    activeLocation?.longitude,
    activePrediction,
  ])

  useRealtimeData({
    prediction_update: (payload) => {
      const level = payload.risk_level || riskLevelFromScore(payload.risk_score)
      patchLocation(payload.location_id, {
        risk_score: payload.risk_score,
        risk_level: level,
        lead_time_minutes: payload.lead_time_minutes,
      })
    },
  })

  // deep-link support: /risk-map?location=<id>
  useEffect(() => {
    const id = searchParams.get('location')
    if (id && locations.length) {
      const found = locations.find((l) => String(l.id ?? l.location_id) === String(id))
      if (found) setSelected(found)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, locations.length])

  const filtered = useMemo(() => {
    if (filter === 'All') return locations
    return locations.filter((l) => (l.risk_level || '').toUpperCase() === filter.toUpperCase())
  }, [locations, filter])

  return (
    <div className="space-y-4">
      <ActiveScenarioCard title="RISK MAP — ACTIVE DISASTER SCENARIO" />

      <ActiveLocationPanel title="RISK MAP — ACTIVE LOCATION" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Risk Map</h1>
          <p className="text-sm text-ink-muted">Hyper-local flood & landslide risk across monitored villages/wards.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-signal/15 text-signal border-signal/40'
                  : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading label="Loading risk map…" />
      ) : error ? (
        <ErrorMessage variant="offline" message={error} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <FloodMap
              locations={activeAsMapLocation ? [...filtered, activeAsMapLocation] : filtered}
              onSelectLocation={setSelected}
              selectedLocation={selected}
              center={activeAsMapLocation ? [activeAsMapLocation.latitude, activeAsMapLocation.longitude] : undefined}
              zoom={activeAsMapLocation ? 12 : undefined}
              height={560}
            />
          </div>

          <div className="panel p-4">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-ink-faint">
                <p className="text-sm">Select a marker on the map to view full location details.</p>
              </div>
            ) : (
              <LocationDetail location={selected} onClose={() => setSelected(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LocationDetail({ location, onClose }) {
  // A scenario marker carries the four manually entered values instead of
  // the seeded sensor fields, so its detail rows differ.
  const rows = location.is_scenario
    ? [
        ['Rainfall', `${location.rainfall} mm`],
        ['Temperature', `${location.temperature} °C`],
        ['Humidity', `${location.humidity}%`],
        ['Soil Moisture', `${location.soil_moisture}%`],
        ['Probability', `${Number(location.probability).toFixed(1)}%`],
        ['Prediction', location.prediction_label],
      ]
    : [
        ['Rainfall', location.rainfall !== undefined ? `${location.rainfall} mm` : '—'],
        ['Soil Moisture', location.soil_moisture !== undefined ? `${location.soil_moisture}%` : '—'],
        ['River Level', location.river_level !== undefined ? `${location.river_level}%` : '—'],
        ['Slope', location.slope !== undefined ? `${location.slope}°` : '—'],
        ['Historical Risk', location.historical_risk ?? '—'],
        ['Estimated Lead Time', formatLeadTime(location.lead_time_minutes)],
      ]

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">{location.name}</h3>
          <p className="text-xs text-ink-muted">{location.district}</p>
          {location.is_scenario && (
            <span className="mt-1 inline-block text-[9px] font-mono uppercase tracking-wide text-signal border border-signal/40 rounded px-1.5 py-0.5">
              Active Disaster Scenario
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-ink-faint hover:text-ink">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-mono font-semibold text-ink">{location.risk_score ?? '—'}</span>
        <RiskBadge level={location.risk_level} size="lg" pulse={(location.risk_level || '').toUpperCase() === 'CRITICAL'} />
      </div>

      <div className="mt-4 divide-y divide-panel-border border-t border-b border-panel-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="font-mono text-ink">{value}</span>
          </div>
        ))}
      </div>

      <Link
        to={location.is_scenario ? '/predictions' : `/predictions?location=${location.id ?? location.location_id}`}
        className="mt-4 inline-flex w-full justify-center text-sm font-medium px-3.5 py-2 rounded-md bg-signal/10 text-signal border border-signal/30 hover:bg-signal/20 transition-colors"
      >
        VIEW DETAILS
      </Link>
    </div>
  )
}
