import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import SensorCard from '../components/SensorCard'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import RainfallChart from '../charts/RainfallChart'
import SoilMoistureChart from '../charts/SoilMoistureChart'
import RiverLevelChart from '../charts/RiverLevelChart'
import ChartTooltip from '../charts/ChartTooltip'
import useSensors from '../hooks/useSensors'
import useRealtimeData from '../hooks/useRealtimeData'

const MAX_POINTS = 15

export default function Sensors() {
  const { sensors, loading, error, refetch, applyUpdate } = useSensors()
  const [history, setHistory] = useState([])

  useRealtimeData({
    sensor_update: (payload) => {
      applyUpdate(payload)
    },
  })

  // build a rolling network-average history so charts move as data streams in
  useEffect(() => {
    if (!sensors.length) return
    const avg = (key) =>
      Math.round(sensors.reduce((sum, s) => sum + (Number(s[key]) || 0), 0) / sensors.length)

    setHistory((prev) => {
      const point = {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        rainfall: avg('rainfall'),
        soil_moisture: avg('soil_moisture'),
        river_level: avg('river_level'),
        temperature: avg('temperature'),
      }
      return [...prev, point].slice(-MAX_POINTS)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors])

  const enoughData = history.length >= 2

  const chartPanels = useMemo(
    () => [
      { title: 'Rainfall', Comp: RainfallChart },
      { title: 'Soil Moisture', Comp: SoilMoistureChart },
      { title: 'River Level', Comp: RiverLevelChart },
    ],
    []
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">Sensor Monitoring</h1>
        <p className="text-sm text-ink-muted">Virtual IoT network — live rainfall, soil, river, and climate readings.</p>
      </div>

      {loading ? (
        <Loading label="Connecting to sensor network…" />
      ) : error ? (
        <ErrorMessage variant="offline" message={error} onRetry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sensors.map((sensor) => (
              <SensorCard key={sensor.sensor_id ?? sensor.location_id} sensor={sensor} />
            ))}
            {sensors.length === 0 && (
              <p className="text-sm text-ink-faint col-span-full text-center py-10">No sensors reporting yet.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chartPanels.map(({ title, Comp }) => (
              <div key={title} className="panel p-4">
                <h3 className="text-sm font-semibold text-ink mb-2">{title}</h3>
                {enoughData ? (
                  <Comp data={history} height={200} />
                ) : (
                  <EmptyChart />
                )}
              </div>
            ))}

            <div className="panel p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">Temperature</h3>
              {enoughData ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#232A35" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: '#232A35' }} tickLine={false} />
                    <YAxis tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip content={<ChartTooltip unit="°C" />} />
                    <Line type="monotone" dataKey="temperature" name="Temperature" stroke="#F0473F" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-ink-faint font-mono">
      Awaiting live readings…
    </div>
  )
}
