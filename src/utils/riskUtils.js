// Centralized risk styling & helpers.
// Every part of the app that needs a risk color, label, or threshold
// should import from here — colors must never be hardcoded elsewhere.

export const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

const RISK_META = {
  LOW: {
    label: 'Low',
    hex: '#34D399',
    text: 'text-risk-low',
    bg: 'bg-risk-low',
    bgSoft: 'bg-risk-low/10',
    border: 'border-risk-low/40',
    ring: 'ring-risk-low/30',
    dot: '🟢',
  },
  MODERATE: {
    label: 'Moderate',
    hex: '#FBBF24',
    text: 'text-risk-moderate',
    bg: 'bg-risk-moderate',
    bgSoft: 'bg-risk-moderate/10',
    border: 'border-risk-moderate/40',
    ring: 'ring-risk-moderate/30',
    dot: '🟡',
  },
  HIGH: {
    label: 'High',
    hex: '#FB923C',
    text: 'text-risk-high',
    bg: 'bg-risk-high',
    bgSoft: 'bg-risk-high/10',
    border: 'border-risk-high/40',
    ring: 'ring-risk-high/30',
    dot: '🟠',
  },
  CRITICAL: {
    label: 'Critical',
    hex: '#F0473F',
    text: 'text-risk-critical',
    bg: 'bg-risk-critical',
    bgSoft: 'bg-risk-critical/10',
    border: 'border-risk-critical/40',
    ring: 'ring-risk-critical/30',
    dot: '🔴',
  },
  UNKNOWN: {
    label: 'Unknown',
    hex: '#525A6B',
    text: 'text-ink-faint',
    bg: 'bg-ink-faint',
    bgSoft: 'bg-ink-faint/10',
    border: 'border-ink-faint/40',
    ring: 'ring-ink-faint/30',
    dot: '⚪',
  },
}

/** Normalize any risk-level-ish string into one of the canonical keys. */
export function normalizeRiskLevel(level) {
  if (!level) return 'UNKNOWN'
  const upper = String(level).trim().toUpperCase()
  return RISK_META[upper] ? upper : 'UNKNOWN'
}

/** Get the full style/meta bundle for a risk level. */
export function getRiskMeta(level) {
  return RISK_META[normalizeRiskLevel(level)]
}

/** Convenience: hex color only (for charts, SVG, map markers). */
export function getRiskColor(level) {
  return getRiskMeta(level).hex
}

/** Derive a risk level from a 0-100 numeric score when the backend only sends a score. */
export function riskLevelFromScore(score) {
  const s = Number(score)
  if (Number.isNaN(s)) return 'UNKNOWN'
  if (s >= 80) return 'CRITICAL'
  if (s >= 55) return 'HIGH'
  if (s >= 30) return 'MODERATE'
  return 'LOW'
}

/** Format minutes into a compact "Xh Ym" / "Ym" lead-time string. */
export function formatLeadTime(minutes) {
  const m = Number(minutes)
  if (Number.isNaN(m) || m < 0) return '—'
  if (m < 60) return `${Math.round(m)} min`
  const h = Math.floor(m / 60)
  const rem = Math.round(m % 60)
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}

/** Format a 0-1 confidence value as a percentage string. */
export function formatConfidence(confidence) {
  const c = Number(confidence)
  if (Number.isNaN(c)) return '—'
  const pct = c <= 1 ? c * 100 : c
  return `${Math.round(pct)}%`
}

/** Relative "X seconds/minutes ago" formatter for live timestamps. */
export function timeAgo(timestamp) {
  if (!timestamp) return '—'
  const then = new Date(timestamp).getTime()
  if (Number.isNaN(then)) return '—'
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

/** Rank helper for sorting locations/alerts by severity (CRITICAL first). */
export function riskRank(level) {
  return RISK_LEVELS.indexOf(normalizeRiskLevel(level))
}
