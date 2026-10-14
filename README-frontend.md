# SENTINEL — Flash Flood Early Warning Frontend

React + Vite control-room dashboard for the **AI-Based Hyper-Local Flash Flood Prediction and Early Warning System for Hilly Regions** (SIH 2026).

This is the **frontend only** (Developer 1's scope): dashboard, GIS risk map, sensor monitoring UI, AI prediction UI, alerts, simulation center, and evacuation UI. It contains no backend, database, or ML logic — it consumes the Node/Express + Python ML service built by the backend developer.

---

## 1. Tech stack

- React 18 + Vite
- React Router v6
- Axios
- Tailwind CSS
- Recharts (charts)
- Leaflet + React-Leaflet + OpenStreetMap (GIS map)
- Socket.IO client (real-time updates)
- Lucide React (icons)

No TypeScript. No backend code lives in this repo.

---

## 2. Project structure

```text
frontend/
├── src/
│   ├── components/     Reusable UI: Navbar, Sidebar, StatCard, RiskBadge, AlertCard, SensorCard, Loading, ErrorMessage
│   ├── pages/           Dashboard, RiskMap, Sensors, Predictions, Alerts, Simulation, Evacuation
│   ├── maps/             FloodMap (Leaflet), LocationMarker, SafeZoneMarker
│   ├── charts/           Rainfall / SoilMoisture / RiverLevel / RiskTrend / RiskDistribution charts
│   ├── services/         api.js (Axios), socket.js (Socket.IO client), mockData.js (dev-only fallback)
│   ├── hooks/            useLocations, useSensors, useRealtimeData
│   ├── utils/            riskUtils.js — the ONLY place risk colors/labels are defined
│   ├── App.jsx, main.jsx, index.css
├── package.json
├── .env.example
└── README.md
```

---

## 3. Installation

Requires Node.js 18+.

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and point `VITE_API_URL` at your backend:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 4. Running

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

Other scripts:

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
npm run lint      # eslint
```

### Running before the backend is ready

Set `VITE_USE_MOCK_DATA=true` in `.env` (this is the default in `.env.example`). Every API call that fails — because the backend isn't running yet — silently falls back to bundled sample data in `src/services/mockData.js`, so every page renders and is fully clickable standalone. This is clearly marked as **dev-only** in that file; once the real backend is live, set the flag to `false` (or delete `mockData.js` and the fallback branches it's wired into inside `src/services/api.js`).

---

## 5. API integration

All requests go through `src/services/api.js`, built on a single Axios instance using `VITE_API_URL` as the base URL. Every function returns a normalized shape:

```js
{ success: boolean, data: any, error: string | null }
```

so pages never need to special-case network errors vs. backend error responses — they just check `res.success`.

Exact endpoints consumed (must match the backend contract — do not rename):

| Function                          | Method & Path                  |
|------------------------------------|---------------------------------|
| `getLocations()`                   | `GET /api/locations`            |
| `getLocationById(id)`               | `GET /api/locations/:id`        |
| `getSensors()`                      | `GET /api/sensors`              |
| `getSensorsByLocation(locationId)`  | `GET /api/sensors/:locationId`  |
| `getPredictions()`                  | `GET /api/predictions`          |
| `createPrediction(payload)`         | `POST /api/predictions`         |
| `getAlerts()`                       | `GET /api/alerts`               |
| `createAlert(payload)`              | `POST /api/alerts`              |
| `updateAlertStatus(id, payload)`    | `PATCH /api/alerts/:id`         |
| `runSimulation(payload)`            | `POST /api/simulation`          |
| `getStatistics()`                   | `GET /api/statistics`           |
| `getSafeZones()`                    | `GET /api/safe-zones`           |

Expected response bodies (per the agreed contract):

```json
// GET /api/locations
{ "success": true, "data": [ /* location objects */ ] }

// POST /api/predictions or GET /api/predictions item shape
{
  "success": true,
  "data": { "risk_score": 86, "risk_level": "HIGH", "confidence": 0.89, "lead_time_minutes": 42 }
}

// GET /api/sensors/:locationId
{
  "success": true,
  "data": {
    "location_id": 1, "rainfall": 85, "soil_moisture": 82, "river_level": 75,
    "humidity": 91, "temperature": 24, "timestamp": "2026-09-06T10:00:00"
  }
}

// POST /api/simulation
{
  "success": true,
  "data": {
    "previous_risk_score": 42, "risk_score": 91, "risk_level": "CRITICAL",
    "lead_time_minutes": 35, "alert_generated": true
  }
}
```

---

## 6. Socket.IO integration

`src/services/socket.js` creates a single shared, lazily-connected Socket.IO client. `src/hooks/useRealtimeData.js` opens the connection on mount and lets any page subscribe to the three backend events without managing socket lifecycle itself:

```js
useRealtimeData({
  sensor_update: (payload) => { /* update sensor cards + charts */ },
  prediction_update: (payload) => { /* update risk score, map marker, stats */ },
  new_alert: (payload) => { /* show notification, bump alert count, prepend to Alerts page */ },
})
```

Event handling per the backend contract:

- **`sensor_update`** → `Sensors` and `Dashboard` update sensor cards, live charts, and "last updated" timestamps.
- **`prediction_update`** → `Dashboard`, `RiskMap`, and `Predictions` update the risk score, risk level badge, and map marker color for that location; dashboard statistics are refreshed.
- **`new_alert`** → `Alerts` page prepends the new alert; `Dashboard` bumps the active-alert count and shows it in the Active Alerts panel.

The Navbar shows a live **LIVE FEED / DISCONNECTED** indicator driven by the socket's actual `connect` / `disconnect` state, so it never claims to be live when it isn't. Socket.IO's own reconnection logic is enabled (infinite retries with backoff), so the UI recovers automatically once the backend comes back.

`VITE_SOCKET_URL` is optional — by default the socket URL is derived from `VITE_API_URL` by stripping the trailing `/api`.

---

## 7. Error handling

Every page follows the same pattern:

- **Loading** — `Loading` component (skeleton/spinner) while a request is in flight.
- **Error / offline** — `ErrorMessage` component with a **Retry** button when a request fails; a single failed panel never crashes the rest of the dashboard, since each page/section fetches and handles its own state independently.
- **Empty state** — explicit "no data yet" copy instead of a blank panel.
- **Socket disconnect** — surfaced via the Navbar's connection badge at all times.

---

## 8. Centralized risk styling

Risk colors/labels are defined **once**, in `src/utils/riskUtils.js`, and consumed everywhere (`RiskBadge`, map markers, charts, stat tiles). Nothing else in the app hardcodes a risk color — to change the palette, edit `riskUtils.js` and `tailwind.config.js`'s `risk` color tokens.

```text
LOW       → green   (#34D399)
MODERATE  → yellow  (#FBBF24)
HIGH      → orange  (#FB923C)
CRITICAL  → red     (#F0473F)
```

---

## 9. Demo flow supported

The app is wired to support the full SIH demo end-to-end: Dashboard starts LOW → open a village → view sensor readings → open Simulation Center → select **Extreme Rainfall** → **Simulate Scenario** → dashboard/map/risk badges update live via the returned prediction → a critical alert appears on the Alerts page → open Evacuation to see the safe zone and route.
