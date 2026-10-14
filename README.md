# AI-Based Hyper-Local Flash Flood Prediction & Early Warning System

**SIH 2026 Prototype — Backend, ML Service, Database & IoT Simulator**

## 🌍 Location-Controlled Intelligence Mode (new)

On top of the original seeded-village demo network, the app now supports a
**global location search** (Navbar) backed by OpenStreetMap Nominatim. Search
any place (e.g. "Munnar", "Chennai", "Kodaikanal") and it becomes the
**active location** for the whole app — Dashboard, Risk Map, AI Predictions,
Alerts, Simulation and Evacuation all update to reflect it, and the
selection persists across navigation (`src/context/LocationContext.jsx`).

Live environmental data for the active location comes from Open-Meteo
(weather, soil moisture, GloFAS river discharge) — **not** official
IMD/CWC data, and clearly labelled as such. Official river gauge **level**
is not available without a real CWC integration, so `river_level` is always
returned as `null` with `"Not connected - CWC integration pending"`; only
`river_discharge` (a distinct hydrological metric) is populated. New
endpoints: `GET /api/location/search`, `GET /api/environment`,
`POST /api/predictions/dynamic`, `GET /api/alerts/dynamic`,
`GET /api/safe-zones/dynamic` (see `backend/routes/`). If the Python ML
service is unreachable, dynamic predictions fall back to a clearly labelled
`"Prototype Fallback"` rule-based score instead of failing silently.

The original seeded-village/sensor-simulator system below is fully
preserved and still works exactly as documented.

---

## 🎯 Active Disaster Scenario Mode (new)

The **AI Disaster Check** is now the central source of a disaster scenario.
Search a location, enter the four environmental values, press **PREDICT
DISASTER**, and that single result drives the whole application:

```
AI Disaster Check → Risk Map → AI Predictions → Alerts → Simulation → Evacuation
```

There is exactly **one source of truth**. Predict HIGH risk for Munnar and
every module shows Munnar / HIGH. Predict LOW for Kovilpatti and every
module switches to Kovilpatti / LOW. The modules cannot disagree, because
none of them recompute anything — they all read the same scenario object.

### Manual Disaster Check workflow

1. Search a location in the Navbar (Nominatim) — it becomes the active location
2. Open **AI Disaster Check** and enter rainfall (0–1000 mm), temperature
   (−50–60 °C), humidity (0–100 %) and soil moisture (0–100 %)
3. Press **PREDICT DISASTER**
4. Frontend → Node backend (validation) → FastAPI ML → MySQL → alert
   generation → complete scenario returned
5. The scenario becomes active everywhere and is stored permanently as history

### Active Scenario architecture

- **State:** `src/context/ScenarioContext.jsx` (React Context), nested inside
  the existing `LocationProvider` in `src/main.jsx`, above `<App />`, so
  navigation never resets it
- **Persistence:** `sessionStorage` for instant restore + `GET
  /api/predictions/active-scenario` as the authoritative source; the server
  always wins
- **Storage:** the newest row in `manual_disaster_scenarios` *is* the active
  scenario — no mutable `is_active` flag that could drift
- **Alerts:** at most one per scenario, enforced by a `UNIQUE` key on
  `scenario_id`, so refreshing never creates duplicates

Severity and evacuation mapping (defined once, in
`backend/services/scenarioService.js`):

| Risk level | Alert | Evacuation status |
|-----------|-------|-------------------|
| LOW | *(none — informational only)* | NOT REQUIRED |
| MODERATE | FLOOD WARNING | MONITOR |
| HIGH | HIGH RISK FLOOD ALERT | PREPARE |
| CRITICAL | CRITICAL FLOOD ALERT | RECOMMENDED |

A LOW-risk scenario deliberately raises **no emergency alert** and
recommends **no evacuation**.

> **On the probability figure:** it is the Prototype Random Forest
> classifier's confidence on a **synthetic** training distribution. It is
> **not** a scientifically validated real-world flash-flood probability and
> must not be presented as one. The API carries
> `prediction.is_validated_forecast: false` and the UI states this on every
> screen that shows a probability.

See **[INTEGRATION_ARCHITECTURE.md](INTEGRATION_ARCHITECTURE.md)** for the
full data flow, the canonical scenario object, per-module consumption and
failure modes.

---

**SIH 2026 Prototype — Backend, ML Service, Database & IoT Simulator**

This repository contains the **backend half** of the project: Node.js/Express
REST API, MySQL database, Python FastAPI Random Forest ML service, hybrid
rule-based risk engine, virtual IoT sensor simulator, and Socket.IO real-time
layer. The React frontend/dashboard is built and maintained separately by
another developer, against the API and Socket.IO contracts documented here.

## ⚠️ Prototype disclaimer

This is a hackathon prototype, not an operational early-warning system:

- All village/location data, sensor readings, and historical events are
  **synthetic/demo data** (see `database/README.md`) — not verified
  government or IMD records.
- The ML model is trained on a **synthetic dataset** (see
  `ml-service/README.md`) because no real, labeled dataset was available.
- **Lead-time estimates are prototype heuristics only** — not a validated,
  physically-modeled, or operationally certified forecast.
- Alerts are simulated (database + Socket.IO + console log) — no paid SMS
  or push notification service is integrated.

## Architecture

```
                    ┌────────────────────────┐
                    │   React Frontend (SPA)  │   <- built separately
                    │  Dashboard / GIS / etc. │
                    └───────────┬─────────────┘
                     REST API   │   Socket.IO events
                                ▼
                    ┌────────────────────────┐
                    │   Node.js / Express      │
                    │   Backend (this repo)    │
                    │  - REST API              │
                    │  - Socket.IO server      │
                    │  - Hybrid risk engine    │
                    │  - Alert engine          │
                    └───────────┬─────────────┘
                        HTTP    │      MySQL
                       (predict)│      (data)
                                ▼
                    ┌────────────────────────┐        ┌───────────────────┐
                    │  Python FastAPI          │        │  MySQL Database    │
                    │  ML Service (this repo)  │        │  (this repo)       │
                    │  - Random Forest model   │        │  6 tables          │
                    └────────────────────────┘        └───────────────────┘

                    ┌────────────────────────┐
                    │  Virtual IoT Simulator   │  --HTTP--> Backend /api/simulation
                    │  (this repo)             │
                    └────────────────────────┘
```

**Request flow for a simulated event:**

```
Simulator generates sensor values
        ↓
POST /api/simulation (Node backend)
        ↓
Sensor reading stored in MySQL, sensor_update emitted
        ↓
Backend builds ML feature vector, POSTs to FastAPI /predict
        ↓
Random Forest returns risk_score / confidence / lead_time
        ↓
Hybrid risk engine applies rule-based adjustments (rainfall, soil,
river, slope, historical risk thresholds)
        ↓
Final prediction stored, prediction_update emitted
        ↓
If risk escalated (e.g. HIGH -> CRITICAL), alert stored + new_alert emitted
        ↓
Frontend (Socket.IO client) receives sensor_update / prediction_update / new_alert
```

## Repository layout

```
src/            React/Vite frontend
  components/     Shared UI (ActiveScenarioCard, LocationSearch, AlertCard, …)
  context/        LocationContext (searched location) + ScenarioContext (active scenario)
  pages/          Dashboard, RiskMap, Sensors, Predictions, Alerts,
                  Simulation, Evacuation, AIDisasterCheck
  services/       api.js (axios REST client), socket.js, mockData.js
  maps/ charts/   Leaflet map + Recharts components
  utils/          riskUtils.js — canonical risk colours, labels, thresholds

backend/        Node.js + Express REST API, Socket.IO server, risk engine, alerting
  controllers/    Request handlers
  routes/         Route definitions
  services/       scenarioService.js (active scenario), mlService, alertService, …
  models/         MySQL data access, incl. manualScenarioModel.js
  config/         db.js connection pool, riskConfig.js

ml-service/     Python FastAPI service
  main.py           /health, /predict, /manual-disaster-predict
  manual_predict.py Manual 4-input classifier + risk banding
  train_manual.py   Trains the manual classifier
  train.py          Trains the risk-score model (run this — not shipped)
  models/ data/     Saved models + synthetic datasets

simulator/      Virtual IoT sensor simulator (Node.js)
database/       schema.sql, seed.sql, migration_manual_scenarios.sql, docs
```

## Quick start (Windows / macOS / Linux)

You need: **Node.js 18+**, **Python 3.10+**, **MySQL 8+**.

### 1. Database

```bash
cd database
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
cd ..
```

> **Already have a populated database?** `schema.sql` begins with
> `DROP DATABASE IF EXISTS flood_prediction` and will destroy your data.
> Run the additive migration instead — it only creates the two new
> scenario tables and touches nothing else:
>
> ```bash
> mysql -u root -p flood_prediction < database/migration_manual_scenarios.sql
> ```

### 2. ML service

```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
python train.py                  # REQUIRED — see note below
uvicorn main:app --reload --port 8000
```

Leave this running in its own terminal.

**Two separate models live here:**

| Model | File | Used by | Shipped? |
|-------|------|---------|----------|
| Manual disaster classifier | `models/manual_disaster_model.joblib` | `POST /manual-disaster-predict` (AI Disaster Check) | **Yes** — works immediately |
| Risk-score model | *(not shipped)* | `POST /predict` (sensor + dynamic pipeline) | **No** — you must run `python train.py` |

So `GET /health` reports `manual_model_loaded: true` but
`model_loaded: false` until you run `train.py`. The AI Disaster Check and
the whole Active Scenario flow work regardless; only the seeded-sensor and
dynamic prediction pipelines need `train.py` (and those already fall back
to a labelled `"Prototype Fallback"` rule-based score if the model is
missing). To retrain the manual classifier: `python train_manual.py`.

Optional risk banding overrides (`ml-service/.env`, see `.env.example`):

```
MANUAL_RISK_CRITICAL_THRESHOLD=85   # set to 101 to disable CRITICAL, capping at HIGH
MANUAL_RISK_HIGH_THRESHOLD=70
MANUAL_RISK_MODERATE_THRESHOLD=40
```

### 3. Backend

Open a **new terminal**:

```bash
cd backend
copy .env.example .env        # Windows
:: or: cp .env.example .env   # macOS/Linux
npm install
npm run dev
```

Edit `.env` first if your MySQL user/password differ from the defaults.
The backend listens on `http://localhost:5000` and expects the ML service at
`http://localhost:8000` (configurable via `ML_SERVICE_URL`).

### 4. Frontend

Open a **new terminal** at the project root:

```bash
npm install
npm run dev          # dev server on http://localhost:5173
# npm run build      # production build into dist/
```

Optional `.env` at the project root (see `.env.example`):

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_USE_MOCK_DATA=false
```

### 5. Virtual IoT simulator

Open a **third terminal**:

```bash
cd simulator
npm install
node sensorSimulator.js demo 1
```

This runs the scripted demo flow (NORMAL → HEAVY_RAIN → EXTREME_RAIN →
CRITICAL) for location `1`, generating alerts you can observe via the API,
database, or a connected frontend/Socket.IO client.

See `DEVELOPMENT.md` for full setup details and `API.md` for the complete
API/Socket.IO reference.

## Documentation index

| Doc                | Contents                                                        |
|---------------------|-------------------------------------------------------------------|
| `README.md` (this file) | Architecture, quick start                                    |
| `INTEGRATION_ARCHITECTURE.md` | Active Disaster Scenario: data flow, scenario object, per-module consumption, failure modes |
| `DEVELOPMENT.md`    | Detailed setup, environment variables, demo scenario, troubleshooting |
| `API.md`            | Full REST API + Socket.IO event reference                        |
| `backend/*`          | Backend-specific notes are inline in code comments               |
| `ml-service/README.md` | ML service setup, training, and disclaimers                   |
| `simulator/README.md`  | Simulator usage modes                                          |
| `database/README.md`   | Schema, seeding, data disclaimer                                |

## Scope note

This repository now contains the **full stack**: the React/Vite frontend
(`src/`), the Node.js/Express backend (`backend/`), the Python FastAPI ML
service (`ml-service/`), the MySQL schema (`database/`) and the virtual IoT
simulator (`simulator/`).

The REST routes and Socket.IO event names in `API.md` remain the contract
between frontend and backend and must not be renamed without updating both
sides.
