import { AlertTriangle, RotateCw, WifiOff } from 'lucide-react'

/**
 * Standard error / empty-state panel with an optional retry action.
 * `variant="offline"` is used specifically for backend-unreachable states.
 */
export default function ErrorMessage({
  title,
  message = 'Something went wrong while reaching the server.',
  onRetry,
  variant = 'error',
}) {
  const isOffline = variant === 'offline'
  const Icon = isOffline ? WifiOff : AlertTriangle

  return (
    <div className="panel flex flex-col items-center justify-center gap-3 py-12 px-6 text-center border-risk-critical/20">
      <div className="w-11 h-11 rounded-full bg-risk-critical/10 border border-risk-critical/30 flex items-center justify-center">
        <Icon className="w-5 h-5 text-risk-critical" strokeWidth={1.75} />
      </div>
      <div>
        <p className="font-medium text-ink">{title || (isOffline ? 'Backend unreachable' : 'Could not load data')}</p>
        <p className="text-sm text-ink-muted mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-md bg-panel-raised border border-panel-border hover:border-signal/40 hover:text-signal transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}
