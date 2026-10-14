import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BrainCircuit,
  CloudRain,
  Droplets,
  Gauge,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Search,
  Database,
  ArrowRight,
} from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import { useActiveLocation } from '../context/LocationContext'
import { useActiveScenario } from '../context/ScenarioContext'

const FIELDS = [
  {
    key: 'rainfall',
    label: 'Rainfall',
    unit: 'mm',
    placeholder: 'e.g. 120',
    icon: CloudRain,
    min: 0,
    max: 1000,
    step: '0.1',
    help: 'Recent rainfall amount',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    placeholder: 'e.g. 28',
    icon: Thermometer,
    min: -50,
    max: 60,
    step: '0.1',
    help: 'Ambient temperature',
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    placeholder: 'e.g. 90',
    icon: Droplets,
    min: 0,
    max: 100,
    step: '0.1',
    help: 'Relative humidity',
  },
  {
    key: 'soil_moisture',
    label: 'Soil Moisture',
    unit: '%',
    placeholder: 'e.g. 80',
    icon: Gauge,
    min: 0,
    max: 100,
    step: '0.1',
    help: 'Volumetric soil moisture',
  },
]

const EMPTY_FORM = {
  rainfall: '',
  temperature: '',
  humidity: '',
  soil_moisture: '',
}

const DOWNSTREAM_MODULES = [
  { to: '/risk-map', label: 'Risk Map' },
  { to: '/predictions', label: 'AI Predictions' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/simulation', label: 'Simulation' },
  { to: '/evacuation', label: 'Evacuation' },
]

export default function AIDisasterCheck() {
  const { selectedLocation } = useActiveLocation()
  const {
    scenario,
    loading,
    error: scenarioError,
    persistenceWarning,
    history,
    runDisasterCheck,
  } = useActiveScenario()

  const [form, setForm] = useState(EMPTY_FORM)
  const [validationError, setValidationError] = useState(null)
  // The scenario produced by *this* page visit, so the result panel shows
  // what the user just submitted rather than a scenario restored from the DB.
  const [justSubmitted, setJustSubmitted] = useState(false)

  const error = validationError || scenarioError
  const result = justSubmitted ? scenario : null

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setValidationError(null)
    setJustSubmitted(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setValidationError(null)
    setJustSubmitted(false)

    // A scenario with no location cannot drive the Risk Map or Evacuation
    // modules, so the location is required before predicting.
    if (!selectedLocation) {
      setValidationError('Please select a location before running AI Disaster Check.')
      return
    }

    const environment = {}
    for (const field of FIELDS) {
      const value = Number(form[field.key])
      if (form[field.key] === '' || !Number.isFinite(value)) {
        setValidationError(`Please enter a valid value for ${field.label}.`)
        return
      }
      if (value < field.min || value > field.max) {
        setValidationError(`${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`)
        return
      }
      environment[field.key] = value
    }

    const response = await runDisasterCheck(
      {
        name: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        district: selectedLocation.district,
        state: selectedLocation.state,
        country: selectedLocation.country,
        address: selectedLocation.address,
      },
      environment
    )

    if (response.success) setJustSubmitted(true)
  }

  const reset = () => {
    setForm(EMPTY_FORM)
    setValidationError(null)
    setJustSubmitted(false)
  }

  const isDisaster = result?.prediction?.disaster === true
  const probability = result?.prediction?.probability ?? 0

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-signal" strokeWidth={1.75} />
          <h1 className="text-lg font-semibold text-ink">AI Disaster Check</h1>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Enter environmental conditions manually for the selected location. The result becomes the{' '}
          <span className="text-ink">active disaster scenario</span> for the Risk Map, AI Predictions, Alerts,
          Simulation and Evacuation modules.
        </p>
      </div>

      {/* Active location — the scenario is attached to this place */}
      {selectedLocation ? (
        <div className="panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <MapPin className="w-4 h-4 text-signal shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{selectedLocation.name}</p>
              <p className="text-[11px] text-ink-faint truncate">
                {[selectedLocation.district, selectedLocation.state, selectedLocation.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
          <p className="text-[11px] font-mono text-ink-faint">
            {Number(selectedLocation.latitude).toFixed(6)}, {Number(selectedLocation.longitude).toFixed(6)}
          </p>
        </div>
      ) : (
        <div className="panel px-4 py-3.5 border-dashed flex items-start gap-3">
          <Search className="w-4 h-4 text-risk-moderate shrink-0 mt-0.5" />
          <p className="text-sm text-ink-muted">
            Please select a location before running AI Disaster Check. Use the search bar at the top (e.g.
            Munnar, Kovilpatti, Chennai).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <form onSubmit={handleSubmit} className="xl:col-span-3 panel p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint font-mono">Manual Environmental Input</p>
              <p className="text-sm text-ink-muted mt-1">Provide the four required conditions.</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-ink-faint hover:text-ink transition-colors"
              title="Reset"
              aria-label="Reset form"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, unit, placeholder, icon: Icon, help, min, max, step }) => (
              <label key={key} className="block">
                <span className="text-xs uppercase tracking-wide text-ink-faint flex items-center gap-2">
                  <Icon className="w-4 h-4 text-signal" strokeWidth={1.6} />
                  {label}
                </span>
                <div className="relative mt-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step={step}
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-panel-raised border border-panel-border rounded-md px-3 py-3 pr-14 text-sm font-mono text-ink placeholder:text-ink-faint focus:border-signal/60 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-ink-faint">
                    {unit}
                  </span>
                </div>
                <span className="block mt-1.5 text-[10px] text-ink-faint">
                  {help} · {min} to {max} {unit}
                </span>
              </label>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-signal/10 border border-signal/40 text-signal px-4 py-3 text-sm font-semibold tracking-wide hover:bg-signal/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'ANALYZING CONDITIONS…' : 'PREDICT DISASTER'}
          </button>

          <p className="mt-3 text-[10px] leading-relaxed text-ink-faint font-mono">
            Prototype Random Forest classifier trained on synthetic data. The probability is the model&rsquo;s
            confidence, not a scientifically validated real-world flood probability, and this is not an
            operational disaster warning.
          </p>
        </form>

        <div className="xl:col-span-2 panel p-5 min-h-[420px]">
          {!result ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-xl bg-signal/10 border border-signal/20 flex items-center justify-center">
                <BrainCircuit className="w-7 h-7 text-signal" strokeWidth={1.5} />
              </div>
              <p className="mt-4 text-sm font-medium text-ink">Awaiting input</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-ink-faint">
                Enter rainfall, temperature, humidity and soil moisture, then run the AI check.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-ink-faint font-mono">Prediction Result</p>
                <RiskBadge level={result.prediction.risk_level} size="sm" />
              </div>

              <div
                className={`mt-4 rounded-lg border p-6 text-center ${
                  isDisaster ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/40 bg-emerald-500/5'
                }`}
              >
                {isDisaster ? (
                  <AlertTriangle className="mx-auto w-10 h-10 text-red-400" strokeWidth={1.5} />
                ) : (
                  <CheckCircle2 className="mx-auto w-10 h-10 text-emerald-400" strokeWidth={1.5} />
                )}

                <p className={`mt-3 text-xl font-semibold ${isDisaster ? 'text-red-400' : 'text-emerald-400'}`}>
                  {result.prediction.prediction}
                </p>
                <p className="mt-2 text-4xl font-mono font-bold text-ink">
                  {Number(probability).toFixed(1)}
                  <span className="text-base text-ink-faint font-normal">%</span>
                </p>
                <p className="text-[10px] uppercase tracking-wide text-ink-faint mt-1">Model probability</p>
              </div>

              <div className="mt-4 rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-ink-faint">Location</p>
                <p className="mt-1 text-sm text-ink">{result.location.name}</p>
                <p className="text-[11px] font-mono text-ink-faint mt-0.5">
                  {Number(result.location.latitude).toFixed(4)}, {Number(result.location.longitude).toFixed(4)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {FIELDS.map(({ key, label, unit }) => (
                  <div key={key} className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
                    <p className="mt-1 font-mono text-sm text-ink">
                      {Number(result.environment[key]).toFixed(1)} <span className="text-ink-faint">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-md border border-panel-border bg-panel-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-faint">Interpretation</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{result.prediction.message}</p>
              </div>

              <div className="mt-3 rounded-md border border-panel-border bg-panel-raised p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-faint">Recommended Action</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{result.recommended_action}</p>
              </div>

              <p className="mt-3 text-[10px] font-mono text-ink-faint">
                Prediction timestamp: {new Date(result.created_at).toLocaleString()}
              </p>

              {persistenceWarning && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-risk-moderate">
                  <Database className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {persistenceWarning}
                </p>
              )}

              <div className="mt-4 border-t border-panel-border pt-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                  This scenario is now active in
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DOWNSTREAM_MODULES.map((m) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-signal/10 text-signal border border-signal/30 hover:bg-signal/20 transition-colors"
                    >
                      {m.label} <ArrowRight className="w-3 h-3" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario history — previous runs are retained, never deleted */}
      {history.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-panel-border">
            <h2 className="text-sm font-semibold text-ink">Scenario History</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Previous AI Disaster Check runs. The most recent one is the active scenario.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-panel-border text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Date / Time</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">Risk</th>
                  <th className="px-4 py-2.5 font-medium">Probability</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, index) => (
                  <tr
                    key={h.scenario_id}
                    className={`border-b border-panel-border/60 last:border-0 ${
                      index === 0 ? 'bg-signal/5' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 text-ink">
                      {h.location_name}
                      {index === 0 && (
                        <span className="ml-2 text-[9px] font-mono uppercase text-signal border border-signal/40 rounded px-1.5 py-0.5">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-faint">
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-muted">{h.prediction}</td>
                    <td className="px-4 py-2.5">
                      <RiskBadge level={h.risk_level} size="sm" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink">{Number(h.probability).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
