export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-panel-raised border border-panel-border rounded-md px-3 py-2 shadow-panel">
      <p className="text-[11px] text-ink-faint font-mono">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs font-mono text-ink mt-0.5" style={{ color: entry.color }}>
          {entry.name ?? entry.dataKey}: {entry.value}
          {unit}
        </p>
      ))}
    </div>
  )
}
