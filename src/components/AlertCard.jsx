import { Check, CheckCheck, MapPin, Clock, ShieldAlert } from 'lucide-react'
import RiskBadge from './RiskBadge'
import { getRiskMeta } from '../utils/riskUtils'

const STATUS_STYLES = {
  ACTIVE: 'text-risk-critical bg-risk-critical/10 border-risk-critical/30',
  ACKNOWLEDGED: 'text-risk-moderate bg-risk-moderate/10 border-risk-moderate/30',
  RESOLVED: 'text-risk-low bg-risk-low/10 border-risk-low/30',
}

export default function AlertCard({ alert, onAcknowledge, onResolve, onViewLocation, compact = false }) {
  const meta = getRiskMeta(alert.severity || alert.risk_level)
  const isCritical = meta.label === 'Critical' && alert.status === 'ACTIVE'
  const statusStyle = STATUS_STYLES[alert.status] || STATUS_STYLES.ACTIVE
  const createdAt = alert.created_at || alert.createdAt

  return (
    <div
      className={`panel p-3.5 border-l-[3px] transition-colors ${
        isCritical ? 'border-l-risk-critical shadow-glow' : `border-l-transparent`
      }`}
      style={!isCritical ? { borderLeftColor: meta.hex, opacity: alert.status === 'RESOLVED' ? 0.6 : 1 } : {}}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-ink-faint">#{alert.id ?? alert.alert_id}</span>
            <RiskBadge level={alert.severity || alert.risk_level} size="sm" pulse={isCritical} />
            <span className={`text-[10px] uppercase tracking-wide font-mono px-1.5 py-0.5 rounded border ${statusStyle}`}>
              {alert.status}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-ink-faint shrink-0" />
            <span className="font-medium truncate">{alert.location_name || alert.location}</span>
          </p>
          {!compact && alert.message && (
            <p className="mt-1 text-sm text-ink-muted leading-snug">{alert.message}</p>
          )}
          <p className="mt-1.5 text-[11px] text-ink-faint font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {createdAt ? new Date(createdAt).toLocaleString() : '—'}
            {typeof alert.risk_score === 'number' && (
              <span className="ml-2">Score {alert.risk_score}</span>
            )}
          </p>
        </div>
        <ShieldAlert
          className={`w-5 h-5 shrink-0 ${isCritical ? 'text-risk-critical animate-blink' : 'text-ink-faint'}`}
          strokeWidth={1.75}
        />
      </div>

      {!compact && (onAcknowledge || onResolve || onViewLocation) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(alert)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-panel-raised border border-panel-border hover:border-risk-moderate/50 hover:text-risk-moderate transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Acknowledge
            </button>
          )}
          {alert.status !== 'RESOLVED' && onResolve && (
            <button
              onClick={() => onResolve(alert)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-panel-raised border border-panel-border hover:border-risk-low/50 hover:text-risk-low transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Resolve
            </button>
          )}
          {onViewLocation && (
            <button
              onClick={() => onViewLocation(alert)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-panel-raised border border-panel-border hover:border-signal/50 hover:text-signal transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" /> View Location
            </button>
          )}
        </div>
      )}
    </div>
  )
}
