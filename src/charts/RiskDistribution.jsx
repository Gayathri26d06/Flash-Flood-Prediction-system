import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { RISK_LEVELS, getRiskMeta } from '../utils/riskUtils'

/** locations: array with a risk_level/riskLevel field. Counts are derived here. */
export default function RiskDistribution({ locations = [], height = 200 }) {
  const counts = RISK_LEVELS.map((level) => ({
    name: getRiskMeta(level).label,
    level,
    value: locations.filter((l) => (l.risk_level || l.riskLevel || '').toUpperCase() === level).length,
    color: getRiskMeta(level).hex,
  }))

  const total = counts.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={counts}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={counts.some((c) => c.value > 0) ? 3 : 0}
            stroke="none"
          >
            {counts.map((entry) => (
              <Cell key={entry.level} fill={entry.color} fillOpacity={entry.value === 0 ? 0.15 : 1} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]
              return (
                <div className="bg-panel-raised border border-panel-border rounded-md px-3 py-2">
                  <p className="text-xs font-mono text-ink" style={{ color: p.payload.color }}>
                    {p.name}: {p.value}
                  </p>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-mono font-semibold text-ink">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">Locations</span>
      </div>
    </div>
  )
}
