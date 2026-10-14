import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  RadioTower,
  BrainCircuit,
  Siren,
  FlaskConical,
  Route,
  ShieldHalf,
  BrainCircuit as BrainCheck,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/risk-map', label: 'Risk Map', icon: Map },
  { to: '/sensors', label: 'Sensors', icon: RadioTower },
  { to: '/predictions', label: 'AI Predictions', icon: BrainCircuit },
  { to: '/alerts', label: 'Alerts', icon: Siren },
  { to: '/simulation', label: 'Simulation', icon: FlaskConical },
  { to: '/evacuation', label: 'Evacuation', icon: Route },
  { to: '/ai-disaster-check', label: 'AI Disaster Check', icon: BrainCheck },
]

export default function Sidebar({ open = false, onClose }) {
  return (
    <>
      {/* mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-60 shrink-0 bg-panel border-r border-panel-border z-40
        transform transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-panel-border">
          <div className="flex items-center gap-2">
            <ShieldHalf className="w-5 h-5 text-signal" strokeWidth={1.75} />
            <div className="leading-tight">
              <p className="font-semibold text-sm tracking-wide text-ink">SENTINEL</p>
              <p className="text-[10px] text-ink-faint font-mono">FLOOD WARNING GRID</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group ${
                  isActive
                    ? 'bg-signal/10 text-signal border border-signal/30'
                    : 'text-ink-muted border border-transparent hover:bg-panel-raised hover:text-ink'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-panel-border">
          <p className="text-[10px] text-ink-faint font-mono leading-relaxed">
            SIH 2026 · Hyper-Local Flash Flood
            <br />
            Prediction & Early Warning System
          </p>
        </div>
      </aside>
    </>
  )
}
