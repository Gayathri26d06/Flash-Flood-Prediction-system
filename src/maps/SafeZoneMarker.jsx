import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const safeZoneIcon = L.divIcon({
  className: 'safe-zone-marker-wrapper',
  html: `
    <div style="width:28px;height:28px;border-radius:8px;background:#34D399;border:2px solid #0A0D12;
      display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #34D39980;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#0A0D12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4.5 8-11.8V5l-8-3-8 3v5.2C4 17.5 12 22 12 22Z"/>
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export default function SafeZoneMarker({ zone }) {
  const lat = zone.latitude ?? zone.lat
  const lng = zone.longitude ?? zone.lng
  if (lat === undefined || lng === undefined) return null

  const availability = zone.availability ?? zone.available_capacity
  const capacity = zone.capacity

  return (
    <Marker position={[lat, lng]} icon={safeZoneIcon}>
      <Popup>
        <div className="p-3 min-w-[200px] font-display">
          <p className="font-semibold text-sm text-ink">{zone.name}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs font-mono text-ink-muted">
            <span>Distance</span>
            <span className="text-ink text-right">{zone.distance ?? '—'} km</span>
            <span>Capacity</span>
            <span className="text-ink text-right">{capacity ?? '—'}</span>
            <span>Available</span>
            <span className="text-risk-low text-right">{availability ?? '—'}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
