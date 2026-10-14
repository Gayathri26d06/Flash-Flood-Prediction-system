import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import './index.css'
import { LocationProvider } from './context/LocationContext.jsx'
import { ScenarioProvider } from './context/ScenarioContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocationProvider>
        {/* ScenarioProvider holds the ACTIVE DISASTER SCENARIO created by the
            AI Disaster Check page. It sits above <App /> so navigating between
            routes never resets it, and every module reads the same object. */}
        <ScenarioProvider>
          <App />
        </ScenarioProvider>
      </LocationProvider>
    </BrowserRouter>
  </React.StrictMode>
)
