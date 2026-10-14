# Integration Architecture — Active Disaster Scenario

This document explains how the **AI Disaster Check** became the central
source of a disaster scenario, and how that scenario flows through every
other module.

---

## 1. The problem this solves

Before this change, each page derived its own view of the world:

- Risk Map showed the seeded demo network, plus whatever location was searched
- AI Predictions showed the seeded `predictions` table
- Alerts showed the seeded `alerts` table
- Simulation started from hard-coded presets
- Evacuation used the seeded at-risk villages
- AI Disaster Check ran a prediction and then **threw it away**

Nothing tied them together, so the Risk Map could show Munnar while AI
Predictions showed something else entirely.

## 2. The fix: one source of truth

```
                    USER
                     │
         searches a location (Nominatim)
                     │
                     ▼
            ┌──────────────────┐
            │  AI DISASTER     │  rainfall / temperature
            │     CHECK        │  humidity / soil moisture
            └────────┬─────────┘
                     │  POST /api/predictions/manual-disaster
                     ▼
            ┌──────────────────┐
            │  NODE BACKEND    │  1. validate location
            │                  │  2. validate 4 env values
            └────────┬─────────┘
                     │  POST /manual-disaster-predict
                     ▼
            ┌──────────────────┐
            │  FASTAPI ML      │  Prototype Random Forest classifier
            │                  │  -> disaster / probability / risk_level
            └────────┬─────────┘
                     │
                     ▼
            ┌──────────────────┐
            │     MYSQL        │  manual_disaster_scenarios  (history)
            │                  │  manual_scenario_alerts     (1 per scenario)
            └────────┬─────────┘
                     │
                     ▼
        ╔════════════════════════════╗
        ║  ACTIVE DISASTER SCENARIO  ║   = newest row in
        ║   (single source of truth) ║     manual_disaster_scenarios
        ╚═════════════╤══════════════╝
                      │
    ┌────────┬────────┼────────┬──────────┐
    ▼        ▼        ▼        ▼          ▼
 Risk Map   AI      Alerts  Simulation Evacuation
           Predictions
```

Every module below the scenario **reads it and renders it**. None of them
re-fetches the ML service, recomputes a probability, or keeps its own copy.
That is what makes the consistency guarantee hold.

---

## 3. Data flow, step by step

### 3.1 Creating a scenario

| # | Layer | What happens |
|---|-------|--------------|
| 1 | Frontend | `AIDisasterCheck.jsx` validates the four inputs client-side and refuses to submit without an active location |
| 2 | Frontend | `ScenarioContext.runDisasterCheck()` POSTs `{ location, rainfall, temperature, humidity, soil_moisture }` |
| 3 | Backend | `predictionController.manualDisasterPrediction` re-validates everything server-side (never trust the client) |
| 4 | Backend | `mlService.getManualDisasterPrediction()` calls FastAPI |
| 5 | ML | `manual_predict.predict()` runs the Random Forest, bands the probability into LOW/MODERATE/HIGH/CRITICAL |
| 6 | Backend | `scenarioService.createScenario()` writes the scenario row |
| 7 | Backend | If risk ≥ MODERATE, writes exactly one alert row and broadcasts it over Socket.IO |
| 8 | Backend | Returns the complete serialized scenario |
| 9 | Frontend | `ScenarioContext` stores it in React state + `sessionStorage`; every subscribed module re-renders |

### 3.2 Reading the scenario

On page load `ScenarioContext` hydrates from two places:

1. **`sessionStorage`** — synchronous, so there is no flash of empty state
2. **`GET /api/predictions/active-scenario`** — authoritative, from MySQL

The server always wins if they disagree. This is why a hard refresh, or
opening the app in a second tab, still shows the same active scenario.

---

## 4. The canonical scenario object

Produced by `backend/services/scenarioService.js → serializeScenario()`.
This shape is the contract between backend and frontend:

```json
{
  "scenario_id": 1,
  "scenario_uid": "b3f1c2a0-…",
  "location": {
    "name": "Munnar", "district": "Idukki", "state": "Kerala",
    "country": "India", "address": null,
    "latitude": 10.0869959, "longitude": 77.0600915
  },
  "environment": {
    "rainfall": 150, "temperature": 28, "humidity": 95, "soil_moisture": 90
  },
  "prediction": {
    "disaster": true,
    "prediction": "DISASTER LIKELY",
    "probability": 99.99,
    "risk_level": "CRITICAL",
    "message": "…",
    "model_source": "Prototype Random Forest classifier",
    "is_validated_forecast": false
  },
  "alert": {
    "id": 1, "severity": "CRITICAL", "title": "CRITICAL FLOOD ALERT",
    "message": "…", "recommended_action": "…", "probability": 99.99,
    "status": "ACTIVE", "source": "MANUAL_SCENARIO"
  },
  "evacuation": {
    "status": "RECOMMENDED", "detail": "…", "risk_level": "CRITICAL"
  },
  "recommended_action": "…",
  "created_at": "2026-09-17T11:36:40.000Z"
}
```

`is_validated_forecast: false` is carried deliberately. The probability is
the prototype classifier's confidence on a **synthetic** training
distribution — not a real-world flood probability — and the UI says so.

---

## 5. How each module consumes it

| Module | What it takes from the scenario | Fallback when no scenario exists |
|--------|--------------------------------|----------------------------------|
| **Risk Map** | Centers on the scenario coordinates; renders a marker colored by `risk_level`, with probability and the four manual values in the popup | Behaves exactly as before: seeded network + searched location |
| **AI Predictions** | Renders `ScenarioPrediction` — location, all four inputs, verdict, risk, probability, timestamp — above the seeded table | Shows the seeded prediction table only |
| **Alerts** | Renders the scenario's own alert with severity, environmental values and recommended action; lists previous scenario alerts below | Shows the seeded network alert feed only |
| **Simulation** | Adds a **Manual Scenario** target; sliders are seeded from the scenario's values so the first run reproduces it and moving them projects forward | Falls back to Active Location, then Seeded/Demo Mode |
| **Evacuation** | Posture (`NOT REQUIRED` / `MONITOR` / `PREPARE` / `RECOMMENDED`) derived from risk; safe zones fetched for the scenario coordinates; demo route drawn to the nearest | Seeded at-risk village workflow, untouched |
| **Dashboard** | Compact scenario card | Prompt to run a check |

### Severity mapping (single definition, in `scenarioService.js`)

| Risk level | Alert | Evacuation |
|-----------|-------|------------|
| LOW | *(none — informational only)* | NOT REQUIRED |
| MODERATE | FLOOD WARNING | MONITOR |
| HIGH | HIGH RISK FLOOD ALERT | PREPARE |
| CRITICAL | CRITICAL FLOOD ALERT | RECOMMENDED |

A LOW-risk scenario deliberately produces **no emergency alert** and **no
evacuation recommendation**.

---

## 6. Why two context providers

`LocationContext` and `ScenarioContext` are separate on purpose:

- **`LocationContext`** (pre-existing) — the searched location and its
  *live* environmental data from Open-Meteo, plus the dynamic prediction
  pipeline. Changes whenever the user searches.
- **`ScenarioContext`** (new) — the *manual* scenario. Changes only when
  the user runs an AI Disaster Check.

Merging them would have meant a location search silently invalidating a
scenario the user deliberately created. Keeping them apart means searching
a new location does not wipe the active scenario until a new prediction is
actually run.

`ScenarioProvider` is nested inside `LocationProvider` in `src/main.jsx`,
above `<App />`, so route changes never reset either one.

---

## 7. Database design notes

Two new tables, both **additive** — no existing table was modified.

### `manual_disaster_scenarios`
Every run is stored and **never deleted**. "Active" is simply
`ORDER BY id DESC LIMIT 1`, which means there is no mutable "is_active"
flag that could drift out of sync.

### `manual_scenario_alerts`
Separate from the existing `alerts` table because `alerts.location_id` is a
foreign key into the seeded `locations` table. A scenario location comes
from Nominatim and has no row there, so reusing `alerts` would have meant
either breaking the FK or polluting `locations` with geocoder results.

**Duplicate prevention:** `scenario_id` carries a `UNIQUE` key, and the
insert uses `ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`. Re-running
the insert for the same scenario is a no-op that returns the existing row,
so a page refresh can never spawn a second alert.

---

## 8. Failure modes

| Failure | Behaviour |
|---------|-----------|
| ML service down | `503` + `"AI prediction service is currently unavailable."`; app keeps running; the previous active scenario still renders |
| MySQL down | Prediction still returns with `meta.persisted: false` and a plain-language warning shown in the UI; scenario will not survive a refresh |
| No location selected | `400` + `"Please select a location before running AI Disaster Check."` (enforced on both client and server) |
| Value out of range | `400` naming the field and its valid range |
| Backend unreachable on load | `ScenarioContext` keeps the `sessionStorage` copy rather than blanking every module |
