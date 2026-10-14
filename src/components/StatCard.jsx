/**
 * A single top-row statistic tile on the dashboard.
 * `tone` maps to a left accent bar + icon color; keep it to semantic
 * tokens (signal / low / moderate / high / critical / neutral) so
 * colors stay centralized rather than hardcoded per usage.
 */
const TONE_STYLES = {
  neutral: { bar: 'bg-ink-faint', icon: 'text-ink-muted' },
  signal: { bar: 'bg-signal', icon: 'text-signal' },
  low: { bar: 'bg-risk-low', icon: 'text-risk-low' },
  moderate: { bar: 'bg-risk-moderate', icon: 'text-risk-moderate' },
  high: { bar: 'bg-risk-high', icon: 'text-risk-high' },
  critical: { bar: 'bg-risk-critical', icon: 'text-risk-critical' },
}

export default function StatCard({ label, value, unit, icon: Icon, tone = 'neutral', sublabel }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral

  return (
    <div className="panel relative overflow-hidden p-4 flex items-start justify-between">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${styles.bar}`} />
      <div className="pl-2">
        <p className="text-[11px] uppercase tracking-wider text-ink-muted font-mono">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-ink font-mono tabular-nums">
          {value}
          {unit && <span className="text-sm text-ink-muted ml-1 font-normal">{unit}</span>}
        </p>
        {sublabel && <p className="mt-1 text-xs text-ink-faint">{sublabel}</p>}
      </div>
      {Icon && (
        <div className={`w-9 h-9 rounded-md bg-panel-raised flex items-center justify-center ${styles.icon}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
        </div>
      )}
    </div>
  )
}
