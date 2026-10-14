import { useCallback, useEffect, useState } from 'react'
import { FlaskConical, Loader2, RotateCcw } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import ErrorMessage from '../components/ErrorMessage'
import ActiveLocationPanel from '../components/ActiveLocationPanel'
import ActiveScenarioCard from '../components/ActiveScenarioCard'
import useLocations from '../hooks/useLocations'
import { runSimulation, createDynamicPrediction } from '../services/api'
import { useActiveLocation } from '../context/LocationContext'
import { useActiveScenario } from '../context/ScenarioContext'
import { formatLeadTime, getRiskColor, riskLevelFromScore } from '../utils/riskUtils'

const SCENARIOS = [
  {
    id: 'NORMAL',
    label: 'Normal Rainfall',
    preset: {
      rainfall: 15,
      soil_moisture: 30,
      river_level: 25,
      humidity: 55,
      temperature: 24,
    },
  },
  {
    id: 'HEAVY_RAIN',
    label: 'Heavy Rainfall',
    preset: {
      rainfall: 55,
      soil_moisture: 55,
      river_level: 50,
      humidity: 70,
      temperature: 22,
    },
  },
  {
    id: 'EXTREME_RAIN',
    label: 'Extreme Rainfall',
    preset: {
      rainfall: 85,
      soil_moisture: 78,
      river_level: 70,
      humidity: 85,
      temperature: 20,
    },
  },
  {
    id: 'RIVER_RISE',
    label: 'Rapid River Rise',
    preset: {
      rainfall: 60,
      soil_moisture: 65,
      river_level: 92,
      humidity: 80,
      temperature: 21,
    },
  },
  {
    id: 'CRITICAL',
    label: 'Critical Flood Scenario',
    preset: {
      rainfall: 98,
      soil_moisture: 95,
      river_level: 97,
      humidity: 92,
      temperature: 19,
    },
  },
]

const SLIDER_FIELDS = [
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', max: 150 },
  { key: 'soil_moisture', label: 'Soil Moisture', unit: '%', max: 100 },
  { key: 'river_level', label: 'River Level', unit: '%', max: 100 },
  { key: 'humidity', label: 'Humidity', unit: '%', max: 100 },
  { key: 'temperature', label: 'Temperature', unit: '°C', max: 45 },
]

export default function Simulation() {
  const { locations, loading: locLoading } = useLocations()
  const { selectedLocation: activeLocation, environmentalData } = useActiveLocation()
  const {
    scenario: activeScenario,
    scenarioLocation,
    scenarioEnvironment,
    scenarioPrediction,
  } = useActiveScenario()

  // Three clearly separated targets:
  //   'scenario' — the manual ACTIVE DISASTER SCENARIO (AI Disaster Check)
  //   'active'   — the globally searched location's live conditions
  //   'db'       — the original seeded demo network (unchanged behaviour)
  const [mode, setMode] = useState('db') // 'db' | 'active' | 'scenario'
  const [locationId, setLocationId] = useState('')
  const [scenario, setScenario] = useState('EXTREME_RAIN')
  const [values, setValues] = useState(SCENARIOS[2].preset)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  /** Seed the sliders from the manually entered scenario values. */
  const applyScenarioValues = useCallback(() => {
    if (!scenarioEnvironment) return
    setScenario('MANUAL_SCENARIO')
    setValues((prev) => ({
      ...prev,
      rainfall: Number(scenarioEnvironment.rainfall),
      soil_moisture: Number(scenarioEnvironment.soil_moisture),
      humidity: Number(scenarioEnvironment.humidity),
      temperature: Number(scenarioEnvironment.temperature),
    }))
  }, [scenarioEnvironment])

  useEffect(() => {
    if (locations.length && !locationId) {
      setLocationId(String(locations[0].id ?? locations[0].location_id))
    }
  }, [locations, locationId])

  // Mode precedence on load: a manual disaster scenario outranks a merely
  // searched location, which outranks the seeded demo network.
  useEffect(() => {
    if (activeScenario) setMode('scenario')
    else if (activeLocation) setMode('active')
  }, [activeScenario, activeLocation])

  // Starting the simulation from the scenario's own values is the whole
  // point of the integration — never from unrelated hard-coded presets.
  useEffect(() => {
    if (mode === 'scenario') applyScenarioValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeScenario?.scenario_id])

  useEffect(() => {
    if (mode === 'active' && environmentalData) {
      setValues((prev) => ({
        ...prev,
        rainfall: Math.round(environmentalData.weather.rainfall ?? prev.rainfall) || prev.rainfall,
        soil_moisture: Math.round(environmentalData.soil.soil_moisture ?? prev.soil_moisture) || prev.soil_moisture,
        humidity: Math.round(environmentalData.weather.humidity ?? prev.humidity) || prev.humidity,
        temperature: Math.round(environmentalData.weather.temperature ?? prev.temperature) || prev.temperature,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, environmentalData])

  const applyScenario = (id) => {
    setScenario(id)

    const found = SCENARIOS.find((s) => s.id === id)

    if (found) {
      setValues(found.preset)
    }
  }

  const handleSlider = (key, val) => {
    // Changing a slider means this is a custom scenario.
    // Keep the backend-compatible scenario value by using NORMAL
    // until the backend supports CUSTOM explicitly.
    setScenario('NORMAL')

    setValues((prev) => ({
      ...prev,
      [key]: Number(val),
    }))
  }

  const currentLocation = locations.find(
    (l) => String(l.id ?? l.location_id) === String(locationId)
  )

  const handleSimulate = async () => {
    setRunning(true)
    setError(null)
    setResult(null)

    // Scenario mode: run the risk engine against the scenario's location,
    // using whatever the sliders currently hold. Because the sliders are
    // seeded from the scenario, the first run reproduces it, and moving
    // them shows how the risk evolves from that starting point.
    if (mode === 'scenario' && activeScenario) {
      const res = await createDynamicPrediction(
        scenarioLocation.latitude,
        scenarioLocation.longitude,
        scenarioLocation.name,
        values
      )

      if (res.success) {
        setResult({
          previous_risk_score: Math.round(scenarioPrediction.probability),
          risk_score: res.data.risk_score,
          risk_level: res.data.risk_level,
          lead_time_minutes: res.data.lead_time_minutes,
          alert_generated: ['HIGH', 'CRITICAL'].includes((res.data.risk_level || '').toUpperCase()),
          prediction_source: res.data.prediction_source,
        })
      } else {
        setError(res.error)
      }

      setRunning(false)
      return
    }

    if (mode === 'active' && activeLocation) {
      const res = await createDynamicPrediction(activeLocation.latitude, activeLocation.longitude, activeLocation.name, values)
      if (res.success) {
        setResult({
          previous_risk_score: undefined,
          risk_score: res.data.risk_score,
          risk_level: res.data.risk_level,
          lead_time_minutes: res.data.lead_time_minutes,
          alert_generated: ['HIGH', 'CRITICAL'].includes((res.data.risk_level || '').toUpperCase()),
          prediction_source: res.data.prediction_source,
        })
      } else {
        setError(res.error)
      }
      setRunning(false)
      return
    }

    const res = await runSimulation({
      location_id: locationId,
      scenario: scenario,
      ...values,
    })

    if (res.success) {
      setResult(res.data)
    } else {
      setError(res.error)
    }

    setRunning(false)
  }

  return (
    <div className="space-y-4">
      <ActiveScenarioCard title="SIMULATION — ACTIVE DISASTER SCENARIO" />

      <ActiveLocationPanel title="SIMULATION — ACTIVE LOCATION" />

      <div>
        <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-signal" />
          Simulation Center
        </h1>

        <p className="text-sm text-ink-muted">
          Model hypothetical flood scenarios and preview how the risk engine would respond.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 panel p-5 space-y-5">
          {/* Mode: seeded demo location vs. globally searched active location */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-faint">Simulation Target</label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('scenario')}
                disabled={!activeScenario}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === 'scenario'
                    ? 'bg-signal/15 text-signal border-signal/40'
                    : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
                }`}
              >
                {activeScenario
                  ? `Manual Scenario (${scenarioLocation.name})`
                  : 'Manual Scenario (run an AI Disaster Check first)'}
              </button>
              <button
                type="button"
                onClick={() => setMode('db')}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                  mode === 'db'
                    ? 'bg-signal/15 text-signal border-signal/40'
                    : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
                }`}
              >
                Seeded Location (Demo Mode)
              </button>
              <button
                type="button"
                onClick={() => setMode('active')}
                disabled={!activeLocation}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === 'active'
                    ? 'bg-signal/15 text-signal border-signal/40'
                    : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
                }`}
              >
                {activeLocation ? `Active Location (${activeLocation.name})` : 'Active Location (search one first)'}
              </button>
            </div>
          </div>

          {/* Location (DB mode only) */}
          {mode === 'db' && (
            <div>
              <label className="text-xs uppercase tracking-wide text-ink-faint">
                Location
              </label>

              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={locLoading}
                className="mt-1.5 w-full bg-panel-raised border border-panel-border rounded-md px-3 py-2 text-sm text-ink focus:border-signal/50"
              >
                {locations.map((l) => (
                  <option
                    key={l.id ?? l.location_id}
                    value={l.id ?? l.location_id}
                  >
                    {l.name} · {l.district}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual scenario starting point */}
          {mode === 'scenario' && activeScenario && (
            <div className="rounded-md border border-signal/30 bg-signal/5 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink">
                  Starting from the manual scenario for{' '}
                  <span className="font-medium">{scenarioLocation.name}</span> —{' '}
                  {scenarioPrediction.risk_level} risk,{' '}
                  {Number(scenarioPrediction.probability).toFixed(1)}% probability.
                </p>
                <button
                  type="button"
                  onClick={applyScenarioValues}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border border-panel-border text-ink-muted hover:text-ink transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to scenario values
                </button>
              </div>
              <p className="mt-1.5 text-[10px] font-mono text-ink-faint">
                Move the sliders to project how risk changes as conditions evolve from this scenario.
              </p>
            </div>
          )}

          {/* Scenario Presets */}
          <div>
            <label className="text-xs uppercase tracking-wide text-ink-faint">
              {mode === 'scenario' ? 'Demo Preset (overrides scenario values)' : 'Scenario Preset'}
            </label>

            <div className="mt-1.5 flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyScenario(s.id)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                    scenario === s.id
                      ? 'bg-signal/15 text-signal border-signal/40'
                      : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Environmental Values */}
          <div className="space-y-4 pt-1">
            {SLIDER_FIELDS.map(({ key, label, unit, max }) => (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-ink-muted">
                    {label}
                  </span>

                  <span className="font-mono text-ink">
                    {values[key]}
                    {unit}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={max}
                  value={values[key]}
                  onChange={(e) =>
                    handleSlider(key, e.target.value)
                  }
                  className="w-full accent-signal h-1.5 rounded-full bg-panel-raised"
                />
              </div>
            ))}
          </div>

          {/* Simulate Button */}
          <button
            type="button"
            onClick={handleSimulate}
            disabled={
              running ||
              (mode === 'db' ? !locationId : mode === 'scenario' ? !activeScenario : !activeLocation)
            }
            className="w-full mt-2 flex items-center justify-center gap-2 bg-signal/15 text-signal border border-signal/40 hover:bg-signal/25 disabled:opacity-50 disabled:cursor-not-allowed rounded-md py-2.5 text-sm font-semibold tracking-wide transition-colors"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}

            {running ? 'RUNNING SIMULATION...' : 'SIMULATE SCENARIO'}
          </button>

          {/* Error */}
          {error && (
            <ErrorMessage
              variant="offline"
              message={error}
              onRetry={handleSimulate}
            />
          )}
        </div>

        {/* Projected Outcome */}
        <div className="panel p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">
            Projected Outcome
          </h3>

          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-ink-faint gap-2">
              <FlaskConical
                className="w-6 h-6"
                strokeWidth={1.5}
              />

              <p className="text-sm">
                Run a scenario to see the before/after projection.
              </p>
            </div>
          ) : (
            <SimulationResult
              result={result}
              locationName={
                mode === 'scenario'
                  ? scenarioLocation?.name
                  : mode === 'active'
                  ? activeLocation?.name
                  : currentLocation?.name
              }
              baselineLabel={mode === 'scenario' ? 'Scenario Risk (manual)' : 'Previous Risk'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SimulationResult({ result, locationName, baselineLabel = 'Previous Risk' }) {
  const prevScore = result.previous_risk_score
  const nextScore = result.risk_score

  const level =
    result.risk_level || riskLevelFromScore(nextScore)

  const prevLevel = riskLevelFromScore(prevScore)

  return (
    <div className="space-y-3 text-center">
      {locationName && (
        <p className="text-xs text-ink-faint font-mono">
          {locationName}
        </p>
      )}

      {/* Previous Risk */}
      <div className="rounded-md bg-panel-raised border border-panel-border py-3">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">
          {baselineLabel}
        </p>

        <p className="text-2xl font-mono text-ink-muted mt-0.5">
          {prevScore ?? '—'}
        </p>

        {prevScore !== undefined && (
          <RiskBadge
            level={prevLevel}
            size="sm"
          />
        )}
      </div>

      {/* New Risk */}
      <div className="rounded-md bg-panel-raised border border-panel-border py-3">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">
          Projected Risk
        </p>

        <p
          className="text-3xl font-mono font-semibold mt-0.5"
          style={{ color: getRiskColor(level) }}
        >
          {nextScore ?? '—'}
        </p>

        <RiskBadge
          level={level}
          size="sm"
        />
      </div>

      {/* Lead Time */}
      <div className="rounded-md bg-panel-raised border border-panel-border py-3">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">
          Estimated Lead Time
        </p>

        <p className="text-xl font-mono text-ink mt-0.5">
          {formatLeadTime(result.lead_time_minutes)}
        </p>
      </div>

      {/* Alert Status */}
      <div className="rounded-md bg-panel-raised border border-panel-border py-3">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">
          Alert Status
        </p>

        <p
          className={`text-sm font-semibold mt-1 ${
            result.alert_generated
              ? 'text-danger'
              : 'text-safe'
          }`}
        >
          {result.alert_generated
            ? 'ALERT GENERATED'
            : 'NO ALERT'}
        </p>
      </div>
    </div>
  )
}