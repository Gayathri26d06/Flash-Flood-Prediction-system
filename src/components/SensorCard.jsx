import { CloudRain, Droplets, Waves, Thermometer, Wind, CircleDot } from 'lucide-react'
import { timeAgo } from '../utils/riskUtils'

const READING_ICONS = {
  rainfall: CloudRain,
  soil_moisture: Droplets,
  river_level: Waves,
  humidity: Wind,
  temperature: Thermometer,
}

const READING_LABELS = {
  rainfall: 'Rainfall',
  soil_moisture: 'Soil Moisture',
  river_level: 'River Level',
  humidity: 'Humidity',
  temperature: 'Temperature',
}

const READING_UNITS = {
  rainfall: 'mm',
  soil_moisture: '%',
  river_level: '%',
  humidity: '%',
  temperature: '°C',
}

const STATUS_STYLES = {
  ONLINE: 'text-risk-low',
  ACTIVE: 'text-risk-low',
  DEGRADED: 'text-risk-moderate',
  OFFLINE: 'text-risk-critical',
}

export default function SensorCard({ sensor }) {
  const status = (sensor.status || 'ONLINE').toUpperCase()
  const statusStyle = STATUS_STYLES[status] || 'text-ink-muted'
  const readingKeys = ['rainfall', 'soil_moisture', 'river_level', 'humidity', 'temperature'].filter(
    (k) => sensor[k] !== undefined && sensor[k] !== null
  )

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] text-ink-faint">
            SENSOR {sensor.sensor_id ?? sensor.id ?? sensor.location_id}
          </p>
          <p className="text-sm font-medium text-ink mt-0.5">{sensor.location_name || sensor.location || `Location ${sensor.location_id}`}</p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-mono ${statusStyle}`}>
          <CircleDot className="w-3 h-3" />
          {status}
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {readingKeys.map((key) => {
          const Icon = READING_ICONS[key]
          return (
            <div key={key} className="rounded-md bg-panel-raised border border-panel-border px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {READING_LABELS[key]}
              </p>
              <p className="text-sm font-mono text-ink mt-0.5">
                {sensor[key]}
                <span className="text-ink-faint text-xs ml-0.5">{READING_UNITS[key]}</span>
              </p>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-faint font-mono">
        Updated {timeAgo(sensor.timestamp || sensor.last_updated)}
      </p>
    </div>
  )
}
