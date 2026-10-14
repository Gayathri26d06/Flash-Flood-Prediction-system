import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import LocationMarker from './LocationMarker'
import SafeZoneMarker from './SafeZoneMarker'
import { RISK_LEVELS, getRiskMeta } from '../utils/riskUtils'

// Default center: a representative hilly-region viewport (Uttarakhand).
const DEFAULT_CENTER = [30.0668, 79.0193]
const DEFAULT_ZOOM = 8

function FlyToLocation({ location }) {
  const map = useMap()
  useEffect(() => {
    if (!location) return
    const lat = location.latitude ?? location.lat
    const lng = location.longitude ?? location.lng
    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], 12, { duration: 0.8 })
    }
  }, [location, map])
  return null
}

export function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[400] panel px-3 py-2 flex items-center gap-3 text-[11px] font-mono">
      {RISK_LEVELS.map((level) => {
        const meta = getRiskMeta(level)
        return (
          <span key={level} className="flex items-center gap-1.5 text-ink-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: meta.hex }} />
            {meta.label}
          </span>
        )
      })}
    </div>
  )
}

export default function FloodMap({
  locations = [],
  safeZones = [],
  evacuationRoute = null,
  selectedLocation = null,
  onSelectLocation,
  height = '100%',
  showLegend = true,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-panel-border" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((loc) => (
          <LocationMarker key={loc.id ?? loc.location_id} location={loc} onSelect={onSelectLocation} />
        ))}

        {safeZones.map((zone) => (
          <SafeZoneMarker key={zone.id ?? zone.name} zone={zone} />
        ))}

        {evacuationRoute && evacuationRoute.length > 1 && (
          <Polyline
            positions={evacuationRoute}
            pathOptions={{ color: '#2DD4E8', weight: 3, dashArray: '6 8', opacity: 0.9 }}
          />
        )}

        <FlyToLocation location={selectedLocation} />
      </MapContainer>

      {showLegend && <MapLegend />}
    </div>
  )
}
