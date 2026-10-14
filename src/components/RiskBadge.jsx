import { getRiskMeta } from '../utils/riskUtils'

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3.5 py-1.5 gap-2',
}

/**
 * The single canonical risk-level badge used everywhere in the app.
 * Pass `pulse` for critical items that need extra visual urgency
 * (e.g. active critical alerts).
 */
export default function RiskBadge({ level, size = 'md', pulse = false, showDot = true }) {
  const meta = getRiskMeta(level)
  const sizeClasses = SIZES[size] || SIZES.md

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-medium uppercase tracking-wide ${meta.text} ${meta.bgSoft} ${meta.border} ${sizeClasses}`}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.bg} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.bg}`} />
        </span>
      )}
      {meta.label}
    </span>
  )
}
