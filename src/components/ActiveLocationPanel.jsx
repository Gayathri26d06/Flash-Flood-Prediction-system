import { MapPin, Search, Thermometer, Droplets, CloudRain, Waves, AlertTriangle } from 'lucide-react'
import { useActiveLocation } from '../context/LocationContext'
import RiskBadge from './RiskBadge'
import Loading from './Loading'
import { formatConfidence, formatLeadTime } from '../utils/riskUtils'

/**
 * Global "Active Location" intelligence card. Renders the currently
 * searched location's live environmental data + AI prediction, or a
 * prompt to search when no location has been selected yet.
 *
 * Used at the top of Dashboard, Risk Map, Predictions, Alerts,
 * Simulation and Evacuation so every page reflects the same active
 * location (see src/context/LocationContext.jsx).
 */
export default function ActiveLocationPanel({ title = 'ACTIVE LOCATION' }) {
  const { selectedLocation, environmentalData, prediction, loading, error } = useActiveLocation()

  if (!selectedLocation) {
    return (
      <div className="panel flex items-center gap-3 px-4 py-3.5 border-dashed">
        <Search className="w-4 h-4 text-ink-faint shrink-0" />
        <p className="text-sm text-ink-muted">
          No active location selected. Use the search bar above to look up any location (e.g. Munnar, Chennai,
          Kochi) — every page will then focus on it.
        </p>
      </div>
    )
  }

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-faint font-mono flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-signal" /> {title}
          </p>
          <h2 className="text-lg font-semibold text-ink mt-0.5">{selectedLocation.name}</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {[selectedLocation.district, selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ')}
          </p>
          <p className="text-[11px] font-mono text-ink-faint mt-1">
            {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </p>
        </div>

        {prediction && (
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl font-mono font-semibold text-ink">{prediction.risk_score}</span>
              <RiskBadge level={prediction.risk_level} size="lg" pulse={(prediction.risk_level || '').toUpperCase() === 'CRITICAL'} />
            </div>
            <p className="text-[11px] font-mono text-ink-faint mt-1">
              Confidence {formatConfidence(prediction.confidence)} · Lead time {formatLeadTime(prediction.lead_time_minutes)}
            </p>
            <p
              className={`text-[10px] font-mono mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                prediction.prediction_source === 'ML Model'
                  ? 'text-risk-low bg-risk-low/10'
                  : 'text-risk-moderate bg-risk-moderate/10'
              }`}
            >
              Prediction Source: {prediction.prediction_source}
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-3">
          <Loading variant="inline" label="Fetching live environmental data…" />
        </div>
      ) : error ? (
        <p className="mt-3 text-xs text-risk-critical flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      ) : null}

      {prediction?.triggered_rules?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {prediction.triggered_rules.map((rule) => (
            <span
              key={rule}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-risk-high/10 text-risk-high border border-risk-high/30"
            >
              {rule.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {environmentalData ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <EnvStat icon={Thermometer} label="Temperature" value={fmt(environmentalData.weather.temperature, '°C')} />
          <EnvStat icon={Droplets} label="Humidity" value={fmt(environmentalData.weather.humidity, '%')} />
          <EnvStat icon={CloudRain} label="Rainfall" value={fmt(environmentalData.weather.rainfall, ' mm')} />
          <EnvStat icon={Waves} label="Soil Moisture" value={fmt(environmentalData.soil.soil_moisture, '%')} />
          <EnvStat icon={Waves} label="River Discharge" value={fmt(environmentalData.river.river_discharge, ' m³/s')} sub="Open-Meteo GloFAS" />
          <EnvStat
            icon={Waves}
            label="River Level"
            value="Unavailable"
            sub="CWC integration pending"
            muted
          />
        </div>
      ) : null}
    </div>
  )
}

function fmt(value, unit) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Math.round(Number(value) * 10) / 10}${unit}`
}

function EnvStat({ icon: Icon, label, value, sub, muted = false }) {
  return (
    <div className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className={`text-sm font-mono mt-1 ${muted ? 'text-ink-faint' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-[9px] text-ink-faint mt-0.5">{sub}</p>}
    </div>
  )
}
