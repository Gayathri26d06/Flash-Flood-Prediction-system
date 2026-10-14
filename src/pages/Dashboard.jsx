import { useEffect, useMemo, useState } from 'react'
import { Map as MapIcon, Siren, ShieldAlert, RadioTower, Gauge, Activity } from 'lucide-react'
import StatCard from '../components/StatCard'
import AlertCard from '../components/AlertCard'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import ActiveLocationPanel from '../components/ActiveLocationPanel'
import ActiveScenarioCard from '../components/ActiveScenarioCard'
import FloodMap from '../maps/FloodMap'
import RiskDistribution from '../charts/RiskDistribution'
import RainfallChart from '../charts/RainfallChart'
import useLocations from '../hooks/useLocations'
import useSensors from '../hooks/useSensors'
import useRealtimeData from '../hooks/useRealtimeData'
import { getAlerts, getStatistics, updateAlertStatus } from '../services/api'
import { riskLevelFromScore, riskRank, timeAgo } from '../utils/riskUtils'

const MAX_TREND_POINTS = 12

export default function Dashboard() {
  const { locations, loading: locLoading, error: locError, refetch: refetchLocations, patchLocation } =
    useLocations()
  const { sensors, loading: sensorsLoading, applyUpdate: applySensorUpdate } = useSensors()

  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsError, setAlertsError] = useState(null)
  const [stats, setStats] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [rainfallTrend, setRainfallTrend] = useState([])

  const loadAlerts = async () => {
    setAlertsLoading(true)
    setAlertsError(null)
    const res = await getAlerts()
    if (res.success) setAlerts(Array.isArray(res.data) ? res.data : [])
    else setAlertsError(res.error)
    setAlertsLoading(false)
  }

  const loadStats = async () => {
    const res = await getStatistics()
    if (res.success) setStats(res.data)
  }

  useEffect(() => {
    loadAlerts()
    loadStats()
  }, [])

  // seed a rainfall trend point whenever we have fresh sensor data
  useEffect(() => {
    if (!sensors.length) return
    const avgRainfall = Math.round(
      sensors.reduce((sum, s) => sum + (Number(s.rainfall) || 0), 0) / sensors.length
    )
    setRainfallTrend((prev) => {
      const next = [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), rainfall: avgRainfall }]
      return next.slice(-MAX_TREND_POINTS)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensors.length])

  const { connected } = useRealtimeData({
    sensor_update: (payload) => {
      applySensorUpdate(payload)
      setLastUpdated(Date.now())
    },
    prediction_update: (payload) => {
      const level = payload.risk_level || riskLevelFromScore(payload.risk_score)
      patchLocation(payload.location_id, {
        risk_score: payload.risk_score,
        risk_level: level,
        lead_time_minutes: payload.lead_time_minutes,
      })
      loadStats()
      setLastUpdated(Date.now())
    },
    new_alert: (payload) => {
      setAlerts((prev) => [payload, ...prev])
      loadStats()
      setLastUpdated(Date.now())
    },
  })

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000)), 1000)
    return () => clearInterval(t)
  }, [lastUpdated])

  const derivedStats = useMemo(() => {
    const critical = locations.filter((l) => (l.risk_level || '').toUpperCase() === 'CRITICAL').length
    const avg = locations.length
      ? Math.round(locations.reduce((s, l) => s + (Number(l.risk_score) || 0), 0) / locations.length)
      : 0
    return {
      monitored_locations: stats?.monitored_locations ?? locations.length,
      active_alerts: stats?.active_alerts ?? alerts.filter((a) => a.status === 'ACTIVE').length,
      critical_locations: stats?.critical_locations ?? critical,
      active_sensors: stats?.active_sensors ?? sensors.filter((s) => (s.status || 'ONLINE').toUpperCase() !== 'OFFLINE').length,
      average_risk: stats?.average_risk ?? avg,
      system_status: stats?.system_status ?? 'OPERATIONAL',
    }
  }, [stats, locations, alerts, sensors])

  const sortedAlerts = useMemo(
    () =>
      [...alerts]
        .filter((a) => a.status !== 'RESOLVED')
        .sort((a, b) => riskRank(b.severity || b.risk_level) - riskRank(a.severity || a.risk_level))
        .slice(0, 6),
    [alerts]
  )

  const handleAcknowledge = async (alert) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, status: 'ACKNOWLEDGED' } : a)))
    await updateAlertStatus(alert.id, { status: 'ACKNOWLEDGED' })
  }

  const handleResolve = async (alert) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, status: 'RESOLVED' } : a)))
    await updateAlertStatus(alert.id, { status: 'RESOLVED' })
  }

  return (
    <div className="space-y-5">
      {/* location-controlled intelligence panel */}
      <ActiveScenarioCard compact />

      <ActiveLocationPanel />

      {/* system status strip */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
          <span className="text-sm font-mono font-medium text-risk-low tracking-wide">
            SYSTEM STATUS: {derivedStats.system_status}
          </span>
        </div>
        <span className="text-xs font-mono text-ink-faint">Last updated: {secondsAgo}s ago</span>
      </div>

      {/* top statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Monitored Locations" value={derivedStats.monitored_locations} icon={MapIcon} tone="signal" />
        <StatCard label="Active Alerts" value={derivedStats.active_alerts} icon={Siren} tone="critical" />
        <StatCard label="Critical Locations" value={derivedStats.critical_locations} icon={ShieldAlert} tone="critical" />
        <StatCard label="Active Sensors" value={derivedStats.active_sensors} icon={RadioTower} tone="low" />
        <StatCard label="Average Risk" value={derivedStats.average_risk} unit="/100" icon={Gauge} tone="moderate" />
        <StatCard label="System Status" value="ONLINE" icon={Activity} tone="signal" sublabel={connected ? 'Live feed active' : 'Feed disconnected'} />
      </div>

      {/* map + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 panel p-3 flex flex-col">
          <div className="flex items-center justify-between px-1 pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-ink">LIVE RISK MAP</h2>
            <span className="text-[11px] font-mono text-ink-faint">{locations.length} locations tracked</span>
          </div>
          {locLoading ? (
            <Loading label="Loading location grid…" />
          ) : locError ? (
            <ErrorMessage variant="offline" message={locError} onRetry={refetchLocations} />
          ) : (
            <FloodMap locations={locations} height={420} />
          )}
        </div>

        <div className="panel p-3.5 flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-ink">ACTIVE ALERTS</h2>
            <span className="text-[11px] font-mono text-ink-faint">{sortedAlerts.length} shown</span>
          </div>
          <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
            {alertsLoading ? (
              <Loading variant="inline" label="Loading alerts…" />
            ) : alertsError ? (
              <ErrorMessage variant="offline" message={alertsError} onRetry={loadAlerts} />
            ) : sortedAlerts.length === 0 ? (
              <p className="text-sm text-ink-faint text-center py-8">No active alerts. All locations nominal.</p>
            ) : (
              sortedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id ?? alert.alert_id}
                  alert={alert}
                  compact
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* secondary row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel p-4">
          <h3 className="text-sm font-semibold text-ink mb-2">Risk Distribution</h3>
          <RiskDistribution locations={locations} height={190} />
        </div>

        <div className="panel p-4">
          <h3 className="text-sm font-semibold text-ink mb-2">Rainfall Trend (network avg)</h3>
          {rainfallTrend.length < 2 ? (
            <div className="h-[190px] flex items-center justify-center text-xs text-ink-faint font-mono">
              Awaiting more data points…
            </div>
          ) : (
            <RainfallChart data={rainfallTrend} height={190} />
          )}
        </div>

        <div className="panel p-4">
          <h3 className="text-sm font-semibold text-ink mb-2">Recent Sensor Updates</h3>
          <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 190 }}>
            {sensorsLoading ? (
              <Loading variant="inline" label="Loading sensors…" />
            ) : sensors.length === 0 ? (
              <p className="text-xs text-ink-faint text-center py-6">No sensor data yet.</p>
            ) : (
              sensors.slice(0, 4).map((s) => (
                <div
                  key={s.sensor_id ?? s.location_id}
                  className="flex items-center justify-between text-xs font-mono px-2.5 py-2 rounded-md bg-panel-raised border border-panel-border"
                >
                  <span className="text-ink truncate">{s.location_name || `Loc ${s.location_id}`}</span>
                  <span className="text-ink-faint">{timeAgo(s.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
