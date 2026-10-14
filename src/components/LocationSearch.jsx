import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, X, Loader2 } from 'lucide-react'
import { searchLocationsByName } from '../services/api'
import { useActiveLocation } from '../context/LocationContext'

const DEBOUNCE_MS = 400

export default function LocationSearch() {
  const { selectedLocation, setSelectedLocation, clearSelectedLocation } = useActiveLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setError(null)
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const res = await searchLocationsByName(query.trim())
      if (res.success) {
        setResults(Array.isArray(res.data) ? res.data : [])
        setError(res.data?.length === 0 ? null : null)
        if (Array.isArray(res.data) && res.data.length === 0) {
          setError('No matching locations found.')
        }
      } else {
        setResults([])
        setError(res.error || 'Location search failed.')
      }
      setSearching(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (result) => {
    setSelectedLocation({
      name: result.name,
      address: result.address || result.display_name,
      latitude: result.latitude,
      longitude: result.longitude,
      district: result.district,
      state: result.state,
      country: result.country,
    })
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    clearSelectedLocation()
    setQuery('')
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs lg:max-w-sm">
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-panel-raised border border-panel-border rounded-md px-3 py-1.5 focus-within:border-signal/50 transition-colors"
      >
        {searching ? (
          <Loader2 className="w-3.5 h-3.5 text-ink-faint shrink-0 animate-spin" />
        ) : (
          <Search className="w-3.5 h-3.5 text-ink-faint shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedLocation ? selectedLocation.name : 'Search any location (e.g. Munnar)'}
          className="bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none w-full min-w-0"
        />
        {selectedLocation && !query && (
          <button
            onClick={handleClear}
            title="Clear active location"
            className="text-ink-faint hover:text-ink shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (query.trim() || error) && (
        <div className="absolute z-50 mt-1.5 w-full bg-panel border border-panel-border rounded-md shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {error && !searching && (
            <p className="px-3.5 py-3 text-xs text-ink-faint">{error}</p>
          )}
          {!error &&
            results.map((r) => (
              <button
                key={r.place_id ?? `${r.latitude}-${r.longitude}`}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-panel-raised transition-colors border-b border-panel-border/60 last:border-0"
              >
                <MapPin className="w-4 h-4 text-signal shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm text-ink truncate">{r.name}</span>
                  <span className="block text-[11px] text-ink-faint truncate">{r.address || r.display_name}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
