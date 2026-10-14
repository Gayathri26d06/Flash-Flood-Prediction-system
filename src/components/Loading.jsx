import { RadioTower } from 'lucide-react'

/**
 * Reusable loading indicator.
 * - variant="inline": small spinner + label for tight spaces (cards)
 * - variant="panel" (default): full panel placeholder for page/section loads
 */
export default function Loading({ label = 'Loading data…', variant = 'panel' }) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-ink-muted text-sm font-mono">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-signal" />
        </span>
        {label}
      </div>
    )
  }

  return (
    <div className="panel flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="relative">
        <RadioTower className="w-8 h-8 text-signal animate-pulse" strokeWidth={1.5} />
        <span className="absolute inset-0 rounded-full animate-pulse-ring border border-signal/40" />
      </div>
      <p className="text-ink-muted text-sm font-mono tracking-wide">{label}</p>
    </div>
  )
}
