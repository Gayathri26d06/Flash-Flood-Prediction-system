import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { AlertTriangle, BrainCircuit, CheckCircle2, Gauge, MapPin, Timer, X } from 'lucide-react'
import RiskBadge from '../components/RiskBadge'
import Loading from '../components/Loading'
import ErrorMessage from '../components/ErrorMessage'
import ActiveLocationPanel from '../components/ActiveLocationPanel'
import ActiveScenarioCard from '../components/ActiveScenarioCard'
import useRealtimeData from '../hooks/useRealtimeData'
import { getPredictions } from '../services/api'
import { useActiveScenario } from '../context/ScenarioContext'
import { formatConfidence, formatLeadTime, getRiskMeta, riskLevelFromScore } from '../utils/riskUtils'

const DEFAULT_FACTORS = [
  { label: 'Heavy Rainfall', weight: 35 },
  { label: 'Soil Saturation', weight: 25 },
  { label: 'River Level', weight: 20 },
  { label: 'Steep Slope', weight: 12 },
  { label: 'Historical Risk', weight: 8 },
]

export default function Predictions() {
  const { scenario, history } = useActiveScenario()
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [searchParams] = useSearchParams()

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await getPredictions()
    if (res.success) setPredictions(Array.isArray(res.data) ? res.data : [])
    else setError(res.error)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const id = searchParams.get('location')
    if (id && predictions.length) {
      const found = predictions.find((p) => String(p.location_id) === String(id))
      if (found) setSelected(found)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, predictions.length])

  useRealtimeData({
    prediction_update: (payload) => {
      setPredictions((prev) => {
        const idx = prev.findIndex((p) => p.location_id === payload.location_id)
        const level = payload.risk_level || riskLevelFromScore(payload.risk_score)
        const merged = { ...payload, risk_level: level, prediction_time: payload.prediction_time || new Date().toISOString() }
        if (idx === -1) return [merged, ...prev]
        const next = [...prev]
        next[idx] = { ...next[idx], ...merged }
        return next
      })
      setSelected((prev) => (prev && prev.location_id === payload.location_id ? { ...prev, ...payload } : prev))
    },
  })

  const sorted = useMemo(
    () => [...predictions].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    [predictions]
  )

  return (
    <div className="space-y-4">
      {/* The active manual scenario takes precedence over the seeded demo
          network below. When one exists, this is what "AI PREDICTION"
          means on this page — no unrelated hard-coded values. */}
      {scenario ? <ScenarioPrediction scenario={scenario} /> : <ActiveScenarioCard title="AI PREDICTION — ACTIVE DISASTER SCENARIO" />}

      <ActiveLocationPanel title="AI PREDICTION — ACTIVE LOCATION" />

      <div>
        <h1 className="text-lg font-semibold text-ink">AI Predictions</h1>
        <p className="text-sm text-ink-muted">
          Random Forest risk-engine output across the seeded monitoring network, refreshed in real time as new
          data arrives.
        </p>
      </div>

      {loading ? (
        <Loading label="Fetching model predictions…" />
      ) : error ? (
        <ErrorMessage variant="offline" message={error} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-panel-border text-left text-[11px] uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Risk Score</th>
                    <th className="px-4 py-3 font-medium">Risk Level</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Lead Time</th>
                    <th className="px-4 py-3 font-medium">Predicted</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr
                      key={p.location_id}
                      onClick={() => setSelected(p)}
                      className={`border-b border-panel-border/60 last:border-0 cursor-pointer transition-colors hover:bg-panel-raised ${
                        selected?.location_id === p.location_id ? 'bg-panel-raised' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-ink">{p.location_name || `Location ${p.location_id}`}</td>
                      <td className="px-4 py-3 font-mono text-ink">{p.risk_score}</td>
                      <td className="px-4 py-3">
                        <RiskBadge level={p.risk_level} size="sm" pulse={(p.risk_level || '').toUpperCase() === 'CRITICAL'} />
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{formatConfidence(p.confidence)}</td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{formatLeadTime(p.lead_time_minutes)}</td>
                      <td className="px-4 py-3 font-mono text-ink-faint text-xs">
                        {p.prediction_time ? new Date(p.prediction_time).toLocaleTimeString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-ink-faint text-sm">
                        No predictions available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel p-4">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-ink-faint gap-2">
                <BrainCircuit className="w-6 h-6" strokeWidth={1.5} />
                <p className="text-sm">Select a row to inspect the model&rsquo;s reasoning.</p>
              </div>
            ) : (
              <PredictionDetail prediction={selected} onClose={() => setSelected(null)} />
            )}
          </div>
        </div>
      )}

      {history.length > 0 && <ScenarioHistoryTable history={history} />}
    </div>
  )
}

/**
 * Full read-out of the ACTIVE DISASTER SCENARIO: location, the four manual
 * environmental inputs, the model verdict, risk level, probability and
 * timestamp. Every value comes straight from ScenarioContext, so this panel
 * always agrees with the Risk Map, Alerts, Simulation and Evacuation pages.
 */
function ScenarioPrediction({ scenario }) {
  const { location, environment, prediction, created_at: createdAt } = scenario
  const meta = getRiskMeta(prediction.risk_level)
  const isDisaster = prediction.disaster === true

  const envRows = [
    ['Rainfall', `${environment.rainfall} mm`],
    ['Temperature', `${environment.temperature} °C`],
    ['Humidity', `${environment.humidity} %`],
    ['Soil Moisture', `${environment.soil_moisture} %`],
  ]

  return (
    <div className="panel p-4 border-l-[3px]" style={{ borderLeftColor: meta.hex }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-faint font-mono flex items-center gap-1.5">
            <BrainCircuit className="w-3 h-3 text-signal" /> AI PREDICTION — ACTIVE DISASTER SCENARIO
          </p>
          <h2 className="text-lg font-semibold text-ink mt-0.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-signal" />
            {[location.name, location.state].filter(Boolean).join(', ')}
          </h2>
          <p className="text-[11px] font-mono text-ink-faint mt-1">
            {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
          </p>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-3xl font-mono font-semibold text-ink">
              {Number(prediction.probability).toFixed(1)}
              <span className="text-base text-ink-faint font-normal">%</span>
            </span>
            <RiskBadge level={prediction.risk_level} size="lg" pulse={prediction.risk_level === 'CRITICAL'} />
          </div>
          <p
            className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold ${
              isDisaster ? 'text-risk-critical' : 'text-risk-low'
            }`}
          >
            {isDisaster ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {prediction.prediction}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {envRows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
            <p className="text-sm font-mono mt-1 text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md border border-panel-border bg-panel-raised p-3">
        <p className="text-[10px] uppercase tracking-wide text-ink-faint">Interpretation</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{prediction.message}</p>
      </div>

      <p className="mt-3 text-[10px] font-mono text-ink-faint">
        Timestamp: {createdAt ? new Date(createdAt).toLocaleString() : '—'} · Source: {prediction.model_source} ·
        Probability is prototype model confidence, not a validated flood forecast.
      </p>
    </div>
  )
}

/** Previous scenarios, retained in MySQL and never deleted. */
function ScenarioHistoryTable({ history }) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 py-3 border-b border-panel-border">
        <h2 className="text-sm font-semibold text-ink">Manual Scenario History</h2>
        <p className="text-xs text-ink-muted mt-0.5">
          Every AI Disaster Check run, newest first. The top row is the active scenario.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-panel-border text-left text-[11px] uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2.5 font-medium">Location</th>
              <th className="px-4 py-2.5 font-medium">Date / Time</th>
              <th className="px-4 py-2.5 font-medium">Result</th>
              <th className="px-4 py-2.5 font-medium">Risk Level</th>
              <th className="px-4 py-2.5 font-medium">Probability</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, index) => (
              <tr
                key={h.scenario_id}
                className={`border-b border-panel-border/60 last:border-0 ${index === 0 ? 'bg-signal/5' : ''}`}
              >
                <td className="px-4 py-2.5 text-ink">
                  {[h.location_name, h.state].filter(Boolean).join(', ')}
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
  )
}

function PredictionDetail({ prediction, onClose }) {
  const meta = getRiskMeta(prediction.risk_level)
  const factors = prediction.factors?.length ? prediction.factors : DEFAULT_FACTORS

  return (
    <div>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink">{prediction.location_name || `Location ${prediction.location_id}`}</p>
        <button onClick={onClose} className="text-ink-faint hover:text-ink">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 rounded-lg border p-4 text-center" style={{ borderColor: `${meta.hex}55`, background: `${meta.hex}0d` }}>
        <p className="text-4xl font-mono font-bold text-ink">
          {prediction.risk_score}
          <span className="text-base text-ink-faint font-normal">/100</span>
        </p>
        <p className="mt-1 text-lg font-semibold tracking-wide" style={{ color: meta.hex }}>
          {meta.label.toUpperCase()} RISK
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
            <Gauge className="w-3 h-3" /> Confidence
          </p>
          <p className="text-lg font-mono text-ink mt-0.5">{formatConfidence(prediction.confidence)}</p>
        </div>
        <div className="rounded-md bg-panel-raised border border-panel-border px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint flex items-center gap-1">
            <Timer className="w-3 h-3" /> Lead Time
          </p>
          <p className="text-lg font-mono text-ink mt-0.5">{formatLeadTime(prediction.lead_time_minutes)}</p>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-xs uppercase tracking-wide text-ink-faint mb-2">Risk Factors</h4>
        <ResponsiveContainer width="100%" height={factors.length * 34 + 10}>
          <BarChart data={factors} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fill: '#8189A0', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="weight" radius={[0, 4, 4, 0]} barSize={14}>
              {factors.map((f, i) => (
                <Cell key={f.label} fill={i === 0 ? meta.hex : '#2DD4E8'} fillOpacity={1 - i * 0.12} />
              ))}
              <LabelList
                dataKey="weight"
                position="right"
                formatter={(v) => `${v}%`}
                style={{ fill: '#E6EAF0', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
