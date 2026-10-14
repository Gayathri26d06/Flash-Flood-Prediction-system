import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import RiskMap from './pages/RiskMap'
import Sensors from './pages/Sensors'
import Predictions from './pages/Predictions'
import Alerts from './pages/Alerts'
import Simulation from './pages/Simulation'
import Evacuation from './pages/Evacuation'
import AIDisasterCheck from './pages/AIDisasterCheck'
import useRealtimeData from './hooks/useRealtimeData'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/risk-map': 'Risk Map',
  '/sensors': 'Sensor Monitoring',
  '/predictions': 'AI Predictions',
  '/alerts': 'Alerts',
  '/simulation': 'Simulation Center',
  '/evacuation': 'Evacuation',
  '/ai-disaster-check': 'AI Disaster Check',
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // App-level socket connection so the connection indicator in the Navbar
  // reflects real status regardless of which page is mounted.
  const { connected } = useRealtimeData()

  const pageTitle = PAGE_TITLES[location.pathname] || 'Control Room'

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar onMenuClick={() => setSidebarOpen(true)} connected={connected} pageTitle={pageTitle} />

        <main className="flex-1 p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/risk-map" element={<RiskMap />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/evacuation" element={<Evacuation />} />
            <Route path="/ai-disaster-check" element={<AIDisasterCheck />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="panel py-20 text-center">
      <p className="text-ink-muted text-sm">Page not found.</p>
    </div>
  )
}
