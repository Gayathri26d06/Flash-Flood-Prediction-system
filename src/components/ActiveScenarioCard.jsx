import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CloudRain,
  Database,
  Droplets,
  Gauge,
  MapPin,
  Thermometer,
} from 'lucide-react'
import RiskBadge from './RiskBadge'
import { useActiveScenario } from '../context/ScenarioContext'
import { getRiskMeta } from '../utils/riskUtils'

/**
 * The shared "ACTIVE DISASTER SCENARIO" card.
 *
 * Rendered at the top of Risk Map, AI Predictions, Alerts, Simulation
 * and Evacuation so every module visibly references the same scenario
 * produced by the AI Disaster Check page.
 *
 * Reads exclusively from ScenarioContext — it never re-fetches or
 * re-derives anything, which is what keeps the modules consistent.
 */
export default function ActiveScenarioCard({
  title = 'ACTIVE DISASTER SCENARIO',
  compact = false,
  showEnvironment = true,
}) {
  const {
    scenario,
    hydrating,
    persistenceWarning,
    scenarioLocation,
    scenarioEnvironment,
    scenarioPrediction,
  } = useActiveScenario()

  if (!scenario) {
    if (hydrating) {
      return (
        <div className="panel px-4 py-3.5 border-dashed">
          <p className="text-sm text-ink-faint">Checking for an active disaster scenario…</p>
        </div>
      )
    }

    return (
      <div className="panel flex items-start gap-3 px-4 py-3.5 border-dashed">
        <BrainCircuit className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
        <p className="text-sm text-ink-muted">
          No active disaster scenario. Search a location, then run an{' '}
          <Link to="/ai-disaster-check" className="text-signal hover:underline">
            AI Disaster Check
          </Link>{' '}
          — the result will drive this page and every other module.
        </p>
      </div>
    )
  }

  const meta = getRiskMeta(scenarioPrediction.risk_level)
  const isDisaster = scenarioPrediction.disaster === true
  const place = [scenarioLocation.district, scenarioLocation.state, scenarioLocation.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className="panel p-4 border-l-[3px]"
      style={{ borderLeftColor: meta.hex }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink-faint font-mono flex items-center gap-1.5">
            <BrainCircuit className="w-3 h-3 text-signal" /> {title}
          </p>
          <h2 className="text-lg font-semibold text-ink mt-0.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-signal shrink-0" />
            {scenarioLocation.name}
          </h2>
          {place && <p className="text-xs text-ink-muted mt-0.5">{place}</p>}
          <p className="text-[11px] font-mono text-ink-faint mt-1">
            {Number(scenarioLocation.latitude).toFixed(4)}, {Number(scenarioLocation.longitude).toFixed(4)}
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-2xl font-mono font-semibold text-ink">
              {Number(scenarioPrediction.probability).toFixed(1)}
              <span className="text-sm text-ink-faint font-normal">%</span>
            </span>
            <RiskBadge
              level={scenarioPrediction.risk_level}
              size="lg"
              pulse={scenarioPrediction.risk_level === 'CRITICAL'}
            />
          </div>

          <p
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${
              isDisaster ? 'text-risk-critical' : 'text-risk-low'
            }`}
          >
            {isDisaster ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {scenarioPrediction.prediction}
          </p>

          <p className="text-[10px] font-mono text-ink-faint mt-1">
            {scenario.created_at ? new Date(scenario.created_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {showEnvironment && !compact && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <EnvStat icon={CloudRain} label="Rainfall" value={`${scenarioEnvironment.rainfall} mm`} />
          <EnvStat icon={Thermometer} label="Temperature" value={`${scenarioEnvironment.temperature} °C`} />
          <EnvStat icon={Droplets} label="Humidity" value={`${scenarioEnvironment.humidity} %`} />
          <EnvStat icon={Gauge} label="Soil Moisture" value={`${scenarioEnvironment.soil_moisture} %`} />
        </div>
      )}

      {!compact && (
        <p className="mt-3 text-[10px] font-mono text-ink-faint">
          Source: {scenarioPrediction.model_source} · Manually entered environmental values ·
          Probability is prototype model confidence, not a validated flood forecast.
        </p>
      )}

      {persistenceWarning && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-risk-moderate">
          <Database className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {persistenceWarning}
        </p>
      )}
    </div>
  )
}

function EnvStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-mono mt-1 text-ink">{value}</p>
    </div>
  )
}
