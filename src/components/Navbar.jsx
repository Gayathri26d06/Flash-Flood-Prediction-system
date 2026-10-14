import { useEffect, useState } from 'react'
import { Menu, Wifi, WifiOff, MapPin } from 'lucide-react'
import LocationSearch from './LocationSearch'
import { useActiveLocation } from '../context/LocationContext'

export default function Navbar({ onMenuClick, connected, pageTitle = 'Control Room' }) {
  const [now, setNow] = useState(new Date())
  const { selectedLocation } = useActiveLocation()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-20 bg-void/85 backdrop-blur border-b border-panel-border">
      <div className="h-16 flex items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-ink-muted hover:text-ink p-1.5 -ml-1.5 rounded-md hover:bg-panel-raised"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block">
            <h1 className="text-sm lg:text-base font-semibold text-ink leading-none">{pageTitle}</h1>
            <p className="text-[11px] text-ink-faint font-mono mt-1">
              {now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
              {now.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-2">
          <LocationSearch />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
              connected
                ? 'text-risk-low bg-risk-low/10 border-risk-low/30'
                : 'text-risk-critical bg-risk-critical/10 border-risk-critical/30'
            }`}
          >
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-blink" />}
            {connected ? 'LIVE FEED' : 'DISCONNECTED'}
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-panel-raised border border-panel-border text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
            OPERATIONAL
          </div>
        </div>
      </div>

      {selectedLocation && (
        <div className="flex items-center gap-2 px-4 lg:px-6 pb-2 -mt-1 text-[11px] font-mono text-signal">
          <MapPin className="w-3 h-3" />
          ACTIVE LOCATION: {selectedLocation.name}
          {selectedLocation.district ? `, ${selectedLocation.district}` : ''}
          {selectedLocation.state ? `, ${selectedLocation.state}` : ''}
          <span className="text-ink-faint">
            ({selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)})
          </span>
        </div>
      )}
    </header>
  )
}
