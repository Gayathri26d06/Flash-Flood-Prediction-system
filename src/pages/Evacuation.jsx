import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, Info, Route as RouteIcon, ShieldCheck, Users } from 'lucide-react'
import FloodMap from '../maps/FloodMap'
import RiskBadge from '../components/RiskBadge'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import ActiveLocationPanel from '../components/ActiveLocationPanel'
import ActiveScenarioCard from '../components/ActiveScenarioCard'
import useLocations from '../hooks/useLocations'
import { getSafeZones, getDynamicSafeZones } from '../services/api'
import { useActiveLocation } from '../context/LocationContext'
import { useActiveScenario } from '../context/ScenarioContext'
import { getRiskMeta, riskRank } from '../utils/riskUtils'

export default function Evacuation() {
  const { locations, loading: locLoading, error: locError, refetch } = useLocations()
  const {
    selectedLocation: activeLocation,
    prediction: activePrediction,
    safeZones: activeSafeZones,
    loading: activeLoading,
  } = useActiveLocation()
  const {
    scenario: activeScenario,
    scenarioLocation,
    scenarioPrediction,
    scenarioEvacuation,
  } = useActiveScenario()
  const [safeZones, setSafeZones] = useState([])
  const [scenarioZones, setScenarioZones] = useState([])
  const [scenarioZonesLoading, setScenarioZonesLoading] = useState(false)
  const [zonesLoading, setZonesLoading] = useState(true)
  const [zonesError, setZonesError] = useState(null)
  const [selectedId, setSelectedId] = useState('')

  const loadZones = async () => {
    setZonesLoading(true)
    setZonesError(null)
    const res = await getSafeZones()
    if (res.success) setSafeZones(Array.isArray(res.data) ? res.data : [])
    else setZonesError(res.error)
    setZonesLoading(false)
  }

  useEffect(() => {
    loadZones()
  }, [])

  // Safe zones around the ACTIVE DISASTER SCENARIO's coordinates, using the
  // project's existing dynamic safe-zone endpoint.
  useEffect(() => {
    if (!activeScenario) {
      setScenarioZones([])
      return
    }

    let cancelled = false
    setScenarioZonesLoading(true)
    ;(async () => {
      const res = await getDynamicSafeZones(scenarioLocation.latitude, scenarioLocation.longitude)
      if (cancelled) return
      setScenarioZones(res.success && Array.isArray(res.data) ? res.data : [])
      setScenarioZonesLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [activeScenario?.scenario_id, scenarioLocation?.latitude, scenarioLocation?.longitude])

  const atRiskLocations = useMemo(
    () =>
      [...locations]
        .filter((l) => ['HIGH', 'CRITICAL'].includes((l.risk_level || '').toUpperCase()))
        .sort((a, b) => riskRank(b.risk_level) - riskRank(a.risk_level)),
    [locations]
  )

  useEffect(() => {
    if (atRiskLocations.length && !selectedId) {
      setSelectedId(String(atRiskLocations[0].id ?? atRiskLocations[0].location_id))
    }
  }, [atRiskLocations, selectedId])

  const selectedLocation = atRiskLocations.find(
    (l) => String(l.id ?? l.location_id) === String(selectedId)
  )
  const nearestZone = safeZones[0]

  // demo evacuation polyline: straight line from affected location to nearest safe zone
  const evacuationRoute = useMemo(() => {
    if (!selectedLocation || !nearestZone) return null
    const lat1 = selectedLocation.latitude ?? selectedLocation.lat
    const lng1 = selectedLocation.longitude ?? selectedLocation.lng
    const lat2 = nearestZone.latitude ?? nearestZone.lat
    const lng2 = nearestZone.longitude ?? nearestZone.lng
    if ([lat1, lng1, lat2, lng2].some((v) => v === undefined)) return null
    // small midpoint jog purely for a more route-like demo polyline
    const midLat = (lat1 + lat2) / 2 + 0.02
    const midLng = (lng1 + lng2) / 2 - 0.02
    return [
      [lat1, lng1],
      [midLat, midLng],
      [lat2, lng2],
    ]
  }, [selectedLocation, nearestZone])

  const loading = locLoading || zonesLoading

  return (
    <div className="space-y-4">
      <ActiveScenarioCard title="EVACUATION — ACTIVE DISASTER SCENARIO" compact />

      {/* Evacuation posture driven entirely by the active scenario. A LOW
          risk scenario deliberately does NOT recommend evacuation. */}
      {activeScenario && (
        <ScenarioEvacuationPanel
          location={scenarioLocation}
          prediction={scenarioPrediction}
          evacuation={scenarioEvacuation}
          zones={scenarioZones}
          zonesLoading={scenarioZonesLoading}
        />
      )}

      <ActiveLocationPanel title="EVACUATION — ACTIVE LOCATION" />

      {activeLocation && (
        <div className="panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-signal" /> Evacuation Guidance for {activeLocation.name}
          </h2>

          {activeLoading ? (
            <Loading variant="inline" label="Finding nearby safe zones…" />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <FloodMap
                  locations={[
                    {
                      id: 'active-location',
                      name: activeLocation.name,
                      district: activeLocation.district,
                      latitude: activeLocation.latitude,
                      longitude: activeLocation.longitude,
                      risk_score: activePrediction?.risk_score,
                      risk_level: activePrediction?.risk_level,
                    },
                  ]}
                  safeZones={activeSafeZones}
                  height={360}
                  center={[activeLocation.latitude, activeLocation.longitude]}
                  zoom={11}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Current Risk</span>
                  <RiskBadge level={activePrediction?.risk_level} size="sm" />
                </div>
                {activeSafeZones.slice(0, 3).map((z) => (
                  <div key={z.id} className="rounded-md bg-panel-raised border border-panel-border p-2.5">
                    <p className="text-xs font-medium text-ink flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-risk-low" /> {z.name}
                    </p>
                    <p className="text-[11px] font-mono text-ink-faint mt-1">{z.distance} km away</p>
                    <p className="text-[10px] text-ink-faint mt-0.5">{z.data_label}</p>
                  </div>
                ))}
                {activeSafeZones.length === 0 && (
                  <p className="text-xs text-ink-faint">No candidate safe zones computed yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h1 className="text-lg font-semibold text-ink flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-signal" /> Evacuation
        </h1>
        <p className="text-sm text-ink-muted">
          Recommended evacuation routes and safe zones for high & critical risk locations (seeded demo network).
          <span className="text-ink-faint"> (Demo / prototype routing — not GPS-accurate.)</span>
        </p>
      </div>

      {loading ? (
        <Loading label="Loading evacuation data…" />
      ) : locError ? (
        <ErrorMessage variant="offline" message={locError} onRetry={refetch} />
      ) : atRiskLocations.length === 0 ? (
        <div className="panel py-16 text-center text-ink-faint text-sm">
          No high or critical risk locations currently require evacuation guidance.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {atRiskLocations.map((l) => {
                const id = String(l.id ?? l.location_id)
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedId(id)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                      selectedId === id
                        ? 'bg-signal/15 text-signal border-signal/40'
                        : 'bg-panel-raised text-ink-muted border-panel-border hover:text-ink'
                    }`}
                  >
                    {l.name}
                    <RiskBadge level={l.risk_level} size="sm" showDot={false} />
                  </button>
                )
              })}
            </div>

            <FloodMap
              locations={selectedLocation ? [selectedLocation] : []}
              safeZones={safeZones}
              evacuationRoute={evacuationRoute}
              height={480}
              center={
                selectedLocation
                  ? [selectedLocation.latitude ?? selectedLocation.lat, selectedLocation.longitude ?? selectedLocation.lng]
                  : undefined
              }
              zoom={11}
            />
          </div>

          <div className="space-y-4">
            <div className="panel p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Evacuation Advisory</h3>
              {selectedLocation && (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Affected Location</span>
                    <span className="font-medium text-ink">{selectedLocation.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Current Risk</span>
                    <RiskBadge level={selectedLocation.risk_level} size="sm" />
                  </div>
                  <div className="rounded-md bg-risk-critical/10 border border-risk-critical/30 px-3 py-2.5 text-risk-critical text-xs leading-relaxed">
                    Recommended Action: Evacuate immediately to nearest designated safe zone. Avoid riverbanks and low-lying routes.
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-ink-faint">
                <span>🔴 Affected Village</span>
                <ArrowDown className="w-3.5 h-3.5" />
                <span>🟢 Safe Zone</span>
              </div>
            </div>

            <div className="panel p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Safe Zones</h3>
              {zonesError ? (
                <ErrorMessage variant="offline" message={zonesError} onRetry={loadZones} />
              ) : (
                <div className="space-y-2.5">
                  {safeZones.map((z) => (
                    <div key={z.id ?? z.name} className="rounded-md bg-panel-raised border border-panel-border p-3">
                      <p className="text-sm font-medium text-ink flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-risk-low" /> {z.name}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono text-ink-muted">
                        <span>{z.distance ?? '—'} km away</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {z.capacity ?? '—'}
                        </span>
                        <span className="text-risk-low text-right">{z.availability ?? '—'} free</span>
                      </div>
                    </div>
                  ))}
                  {safeZones.length === 0 && (
                    <p className="text-xs text-ink-faint text-center py-6">No safe zone data available.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Evacuation guidance for the ACTIVE DISASTER SCENARIO.
 *
 * Status mapping comes from the backend (scenarioService.evacuationGuidance)
 * so the frontend never invents its own posture:
 *   LOW      -> NOT REQUIRED
 *   MODERATE -> MONITOR
 *   HIGH     -> PREPARE
 *   CRITICAL -> RECOMMENDED
 */
function ScenarioEvacuationPanel({ location, prediction, evacuation, zones, zonesLoading }) {
  const meta = getRiskMeta(prediction.risk_level)
  const isEmergency = ['HIGH', 'CRITICAL'].includes(prediction.risk_level)
  const nearest = zones[0]

  // Straight-line demo polyline from the scenario location to the nearest
  // candidate safe zone — same prototype approach as the seeded network below.
  const route =
    nearest && nearest.latitude !== undefined && nearest.longitude !== undefined
      ? [
          [location.latitude, location.longitude],
          [
            (location.latitude + nearest.latitude) / 2 + 0.02,
            (location.longitude + nearest.longitude) / 2 - 0.02,
          ],
          [nearest.latitude, nearest.longitude],
        ]
      : null

  return (
    <div className="panel p-4 space-y-3 border-l-[3px]" style={{ borderLeftColor: meta.hex }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-signal" /> Evacuation Guidance — {location.name}
        </h2>
        <div className="flex items-center gap-2">
          <RiskBadge level={prediction.risk_level} size="sm" pulse={prediction.risk_level === 'CRITICAL'} />
          <span
            className="text-[11px] font-mono uppercase tracking-wide px-2 py-1 rounded"
            style={{ color: meta.hex, background: `${meta.hex}1a`, border: `1px solid ${meta.hex}55` }}
          >
            {evacuation.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <FloodMap
            locations={[
              {
                id: 'scenario-location',
                name: location.name,
                district: [location.district, location.state].filter(Boolean).join(', '),
                latitude: location.latitude,
                longitude: location.longitude,
                risk_score: Math.round(prediction.probability),
                risk_level: prediction.risk_level,
                probability: prediction.probability,
                prediction_label: prediction.prediction,
                is_scenario: true,
              },
            ]}
            safeZones={zones}
            evacuationRoute={route}
            height={360}
            center={[location.latitude, location.longitude]}
            zoom={11}
          />
        </div>

        <div className="space-y-3">
          <div
            className="rounded-md px-3 py-2.5 text-xs leading-relaxed"
            style={{
              background: `${meta.hex}0d`,
              border: `1px solid ${meta.hex}4d`,
              color: isEmergency ? meta.hex : undefined,
            }}
          >
            {!isEmergency && <Info className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-ink-faint" />}
            <span className={isEmergency ? '' : 'text-ink-muted'}>{evacuation.detail}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Disaster Probability</span>
            <span className="font-mono text-ink">{Number(prediction.probability).toFixed(1)}%</span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-1.5">Nearest Safe Zones</p>
            {zonesLoading ? (
              <Loading variant="inline" label="Finding nearby safe zones…" />
            ) : zones.length === 0 ? (
              <p className="text-xs text-ink-faint">No candidate safe zones computed for this location.</p>
            ) : (
              <div className="space-y-2">
                {zones.slice(0, 3).map((z) => (
                  <div key={z.id ?? z.name} className="rounded-md bg-panel-raised border border-panel-border p-2.5">
                    <p className="text-xs font-medium text-ink flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-risk-low" /> {z.name}
                    </p>
                    <p className="text-[11px] font-mono text-ink-faint mt-1">{z.distance ?? '—'} km away</p>
                    {z.data_label && <p className="text-[10px] text-ink-faint mt-0.5">{z.data_label}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
