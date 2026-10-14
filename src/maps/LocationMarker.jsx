import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import { getRiskMeta, formatLeadTime } from '../utils/riskUtils'

/** Builds a pulsing divIcon colored by risk level — no default Leaflet pin. */
function buildRiskIcon(level, size = 26) {
  const meta = getRiskMeta(level)
  const isCritical = meta.label === 'Critical'
  return L.divIcon({
    className: 'risk-marker-wrapper',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${
          isCritical
            ? `<span style="position:absolute;inset:0;border-radius:999px;background:${meta.hex}55;animation:riskPulse 1.6s ease-out infinite;"></span>`
            : ''
        }
        <span style="position:absolute;inset:3px;border-radius:999px;background:${meta.hex};border:2px solid #0A0D12;box-shadow:0 0 8px ${meta.hex}99;"></span>
      </div>
      <style>
        @keyframes riskPulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.1); opacity: 0; }
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function LocationMarker({ location, onSelect }) {
  const level = location.risk_level || location.riskLevel
  const meta = getRiskMeta(level)
  const lat = location.latitude ?? location.lat
  const lng = location.longitude ?? location.lng

  if (lat === undefined || lng === undefined) return null

  return (
    <Marker
      position={[lat, lng]}
      icon={buildRiskIcon(level)}
      eventHandlers={{ click: () => onSelect?.(location) }}
    >
      <Popup>
        <div className="p-3 min-w-[220px] font-display">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-ink text-sm">{location.name || location.village_name}</p>
            <span
              className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ color: meta.hex, background: `${meta.hex}1a`, border: `1px solid ${meta.hex}55` }}
            >
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{location.district}</p>

          {/* A marker fed by the ACTIVE DISASTER SCENARIO carries the four
              manually entered values and a model probability instead of the
              seeded sensor fields, so it gets its own popup layout. */}
          {location.is_scenario ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs font-mono text-ink-muted">
              <span>Probability</span>
              <span className="text-ink text-right">{Number(location.probability).toFixed(1)}%</span>
              <span>Prediction</span>
              <span className="text-ink text-right">{location.prediction_label}</span>
              <span>Rainfall</span>
              <span className="text-ink text-right">{location.rainfall} mm</span>
              <span>Temperature</span>
              <span className="text-ink text-right">{location.temperature}°C</span>
              <span>Humidity</span>
              <span className="text-ink text-right">{location.humidity}%</span>
              <span>Soil Moisture</span>
              <span className="text-ink text-right">{location.soil_moisture}%</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs font-mono text-ink-muted">
              <span>Risk Score</span>
              <span className="text-ink text-right">{location.risk_score ?? '—'}</span>
              <span>Rainfall</span>
              <span className="text-ink text-right">{location.rainfall ?? '—'} mm</span>
              <span>Soil Moisture</span>
              <span className="text-ink text-right">{location.soil_moisture ?? '—'}%</span>
              <span>River Level</span>
              <span className="text-ink text-right">{location.river_level ?? '—'}%</span>
              <span>Slope</span>
              <span className="text-ink text-right">{location.slope ?? '—'}°</span>
              <span>Historical Risk</span>
              <span className="text-ink text-right">{location.historical_risk ?? '—'}</span>
              <span>Lead Time</span>
              <span className="text-ink text-right">{formatLeadTime(location.lead_time_minutes)}</span>
            </div>
          )}

          <Link
            to={location.is_scenario ? '/predictions' : `/risk-map?location=${location.id ?? location.location_id}`}
            className="mt-3 inline-flex w-full justify-center text-xs font-medium px-3 py-1.5 rounded-md bg-signal/10 text-signal border border-signal/30 hover:bg-signal/20 transition-colors"
          >
            VIEW DETAILS
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}
