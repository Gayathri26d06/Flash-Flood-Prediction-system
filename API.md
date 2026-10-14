# API.md — REST API & Socket.IO Reference

Base URL (default): `http://localhost:5000`

All REST responses use one of these two envelopes:

**Success**
```json
{ "success": true, "data": { } }
```

**Error**
```json
{ "success": false, "message": "Error description" }
```

---

## REST API

### `GET /api/locations`

Returns all monitored locations with their latest risk prediction (if any).

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Demo Village A - Munnar Hills",
      "district": "Idukki",
      "state": "Kerala",
      "latitude": 10.0889,
      "longitude": 77.0595,
      "elevation": 1650,
      "slope": 32.5,
      "population": 2400,
      "historical_risk": 0.72,
      "is_demo_data": true,
      "risk_score": 65,
      "risk_level": "HIGH",
      "confidence": 0.87,
      "lead_time": 42
    }
  ]
}
```
`risk_score`/`risk_level`/`confidence`/`lead_time` are `null` (and `risk_level`
is `"UNKNOWN"`) until a prediction has been generated for that location.

---

### `GET /api/locations/:id`

Single location, same shape as one item above.
`404` if the id doesn't exist.

---

### `GET /api/sensors`

Latest sensor reading for every location.

```json
{
  "success": true,
  "data": [
    {
      "location_id": 1,
      "rainfall": 85,
      "soil_moisture": 82,
      "river_level": 75,
      "humidity": 91,
      "temperature": 24,
      "is_synthetic": true,
      "timestamp": "2026-09-06T10:00:00"
    }
  ]
}
```

---

### `GET /api/sensors/:locationId`

Latest sensor reading for one location (same shape as one item above).
`404` if no reading exists yet for that location.

---

### `GET /api/predictions`

Latest prediction per location, sorted by risk score descending.

```json
{
  "success": true,
  "data": [
    {
      "location_id": 1,
      "location_name": "Demo Village A - Munnar Hills",
      "district": "Idukki",
      "state": "Kerala",
      "risk_score": 86,
      "risk_level": "HIGH",
      "confidence": 0.89,
      "lead_time": 42,
      "prediction_time": "2026-09-06T10:00:05"
    }
  ]
}
```

---

### `POST /api/predictions`

Runs the full ML + hybrid risk engine pipeline for a location, using its
**most recent stored sensor reading** (does not accept new sensor values —
use `/api/simulation` for that).

Request:
```json
{ "location_id": 1 }
```

Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "previous_risk_score": 42,
    "risk_score": 86,
    "risk_level": "HIGH",
    "confidence": 0.89,
    "lead_time_minutes": 42,
    "triggered_rules": ["HIGH_RAINFALL", "HIGH_SOIL_MOISTURE"],
    "alert_generated": true,
    "alert": { "...": "alert object, or null" }
  }
}
```
`422` if the location has no sensor data yet. `503`/`504` if the ML service
is unavailable/times out.

---

### `GET /api/alerts`

Optional query params: `?status=ACTIVE|ACKNOWLEDGED|RESOLVED`, `?location_id=1`.

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "location_id": 1,
      "location_name": "Demo Village A - Munnar Hills",
      "district": "Idukki",
      "state": "Kerala",
      "severity": "CRITICAL",
      "message": "CRITICAL FLASH FLOOD WARNING\n\nLocation: ...",
      "risk_score": 92,
      "status": "ACTIVE",
      "created_at": "2026-09-06T10:00:05",
      "updated_at": "2026-09-06T10:00:05"
    }
  ]
}
```

---

### `POST /api/alerts`

Manually create an alert (e.g. admin override / manual warning).

Request:
```json
{
  "location_id": 1,
  "severity": "HIGH",
  "message": "Manually issued advisory.",
  "risk_score": 70
}
```

Response (`201 Created`): the created alert object. Also emits `new_alert`.

---

### `PATCH /api/alerts/:id`

Update an alert's status.

Request:
```json
{ "status": "ACKNOWLEDGED" }
```
Valid values: `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`. `404` if the alert doesn't exist.

---

### `POST /api/simulation`

The core demo-driving endpoint. Accepts a scenario + sensor values for a
location, stores the reading, runs the ML + hybrid risk engine pipeline,
stores the prediction, generates an alert if the risk escalated, and emits
all three Socket.IO events.

Request:
```json
{
  "location_id": 1,
  "scenario": "EXTREME_RAIN",
  "rainfall": 110,
  "soil_moisture": 91,
  "river_level": 88,
  "humidity": 95,
  "temperature": 23
}
```
`scenario` must be one of: `NORMAL`, `HEAVY_RAIN`, `EXTREME_RAIN`, `RIVER_RISE`, `CRITICAL`.

Response:
```json
{
  "success": true,
  "data": {
    "scenario": "EXTREME_RAIN",
    "previous_risk_score": 42,
    "risk_score": 93,
    "risk_level": "CRITICAL",
    "lead_time_minutes": 35,
    "alert_generated": true
  }
}
```

---

### `GET /api/statistics`

Dashboard summary numbers.

```json
{
  "success": true,
  "data": {
    "monitored_locations": 20,
    "active_alerts": 3,
    "critical_locations": 2,
    "active_sensors": 20,
    "average_risk": 54.2
  }
}
```

---

### `GET /api/safe-zones`

Optional query param: `?location_id=1`.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Demo Community Shelter - Munnar",
      "latitude": 10.09,
      "longitude": 77.061,
      "capacity": 500,
      "location_id": 1
    }
  ]
}
```

---

## Active Disaster Scenario endpoints (new)

These power the AI Disaster Check → Risk Map / AI Predictions / Alerts /
Simulation / Evacuation integration. See `INTEGRATION_ARCHITECTURE.md`.

### `POST /api/predictions/manual-disaster`

Runs the manual AI Disaster Check and creates the **active disaster
scenario**. Validates input, calls the FastAPI ML service, persists the
scenario to MySQL, generates an alert if warranted, and returns the
complete scenario.

**Request**

```json
{
  "location": {
    "name": "Munnar",
    "district": "Idukki",
    "state": "Kerala",
    "country": "India",
    "address": "Munnar, Idukki, Kerala, India",
    "latitude": 10.0869959,
    "longitude": 77.0600915
  },
  "rainfall": 150,
  "temperature": 28,
  "humidity": 95,
  "soil_moisture": 90
}
```

`location` is **required**. `name`, `latitude` and `longitude` are
mandatory within it; `district`, `state`, `country` and `address` are
optional. Flat `lat` / `lon` / `location_name` keys are also accepted.

**Validation ranges**

| Field | Range |
|-------|-------|
| `rainfall` | 0 – 1000 mm |
| `temperature` | −50 – 60 °C |
| `humidity` | 0 – 100 % |
| `soil_moisture` | 0 – 100 % |

**Response — `201 Created`**

```json
{
  "success": true,
  "data": {
    "scenario_id": 1,
    "scenario_uid": "b3f1c2a0-5d7e-4a11-9c3f-2e8d6a4b1f90",
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
      "message": "Extreme environmental conditions detected …",
      "model_source": "Prototype Random Forest classifier",
      "is_validated_forecast": false
    },
    "alert": {
      "id": 1,
      "scenario_id": 1,
      "severity": "CRITICAL",
      "title": "CRITICAL FLOOD ALERT",
      "message": "CRITICAL FLOOD ALERT\n\nLocation: Munnar, Kerala\n…",
      "recommended_action": "Evacuate to the nearest designated safe zone immediately. …",
      "probability": 99.99,
      "status": "ACTIVE",
      "source": "MANUAL_SCENARIO",
      "created_at": "2026-09-17T11:36:40.000Z"
    },
    "evacuation": {
      "status": "RECOMMENDED",
      "detail": "Evacuation recommended now. …",
      "risk_level": "CRITICAL"
    },
    "recommended_action": "Evacuate to the nearest designated safe zone immediately. …",
    "created_at": "2026-09-17T11:36:40.000Z",
    "timestamp": "2026-09-17T11:36:40.000Z"
  },
  "meta": { "persisted": true }
}
```

`alert` is `null` for LOW-risk scenarios — those raise no emergency alert
by design.

**Degraded response — `200 OK` (MySQL unavailable)**

The prediction still succeeds, but is not stored and does not become the
active scenario:

```json
{
  "success": true,
  "data": { "scenario_id": null, "...": "..." },
  "meta": {
    "persisted": false,
    "database_error": "The prediction succeeded but could not be saved: the database is unavailable. …"
  }
}
```

**Errors**

| Status | Cause |
|--------|-------|
| 400 | `"Please select a location before running AI Disaster Check."` |
| 400 | `"Missing required field(s): humidity, soil_moisture"` |
| 400 | `"Rainfall must be between 0 and 1000 mm."` |
| 400 | `"Rainfall must be a number."` |
| 503 | `"ML prediction service is currently unavailable. Please try again shortly."` |
| 504 | ML service timed out |

---

### `GET /api/predictions/active-scenario`

Returns the current active scenario — the most recent row in
`manual_disaster_scenarios`, with its alert attached. Same `data` shape as
the POST above.

```json
{ "success": true, "data": { "scenario_id": 1, "...": "..." } }
```

When no scenario has ever been run:

```json
{
  "success": true,
  "data": null,
  "message": "No active disaster scenario yet. Run an AI Disaster Check to create one."
}
```

---

### `GET /api/predictions/history`

Scenario history, newest first. Scenarios are never deleted.

**Query parameters:** `limit` (default 25, max 200), `offset` (default 0)

```json
{
  "success": true,
  "data": [
    {
      "scenario_id": 2,
      "scenario_uid": "…",
      "location_name": "Kovilpatti",
      "state": "Tamil Nadu",
      "country": "India",
      "latitude": 9.1712,
      "longitude": 77.8697,
      "rainfall": 5, "temperature": 34, "humidity": 40, "soil_moisture": 15,
      "disaster": false,
      "prediction": "NO DISASTER",
      "probability": 0,
      "risk_level": "LOW",
      "created_at": "2026-09-17T11:38:02.000Z"
    }
  ],
  "meta": { "total": 2, "count": 1 }
}
```

---

### `GET /api/alerts/scenario`

Alerts auto-generated from manual scenarios. Stored in
`manual_scenario_alerts` rather than `alerts`, because `alerts.location_id`
is a foreign key into the seeded `locations` table and cannot represent an
arbitrary geocoded place.

Exactly one alert exists per scenario (`UNIQUE` key on `scenario_id`), so
repeated reads never produce duplicates.

**Query parameters:** `limit` (default 25, max 200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scenario_id": 1,
      "location_name": "Munnar",
      "latitude": 10.0869959,
      "longitude": 77.0600915,
      "severity": "CRITICAL",
      "title": "CRITICAL FLOOD ALERT",
      "message": "…",
      "recommended_action": "…",
      "probability": 99.99,
      "status": "ACTIVE",
      "source": "MANUAL_SCENARIO",
      "created_at": "2026-09-17T11:36:40.000Z"
    }
  ]
}
```

---

### `PATCH /api/alerts/scenario/:id`

Acknowledge or resolve a scenario alert.

**Request:** `{ "status": "ACKNOWLEDGED" }` — one of `ACTIVE`,
`ACKNOWLEDGED`, `RESOLVED`.

**Response:** `{ "success": true, "data": { "id": 1, "status": "ACKNOWLEDGED" } }`

Returns `400` for an invalid status, `404` if the alert does not exist.

---

### Risk level bands

The ML service maps the classifier's 0–100 probability onto a risk level.
Thresholds are configurable via environment variables in `ml-service/.env`:

| Risk level | Default band | Env var |
|-----------|--------------|---------|
| CRITICAL | ≥ 85 | `MANUAL_RISK_CRITICAL_THRESHOLD` |
| HIGH | ≥ 70 | `MANUAL_RISK_HIGH_THRESHOLD` |
| MODERATE | ≥ 40 | `MANUAL_RISK_MODERATE_THRESHOLD` |
| LOW | < 40 | — |

Set `MANUAL_RISK_CRITICAL_THRESHOLD=101` to disable the CRITICAL tier and
cap output at HIGH.

> The probability is the prototype Random Forest's confidence on a
> **synthetic** training distribution — not a validated real-world flood
> probability. The API carries `is_validated_forecast: false` accordingly.

---

## Error responses

| Status | Meaning                                                        |
|--------|-------------------------------------------------------------------|
| 400    | Invalid/missing request parameters                                |
| 404    | Resource (location, alert, sensor data) not found                 |
| 422    | Request is well-formed but can't be processed (e.g. no sensor data yet) |
| 500    | Unexpected server or database error                                |
| 502    | ML service returned an unexpected error                            |
| 503    | ML service is unavailable / model not loaded                       |
| 504    | ML service request timed out                                       |

---

## Socket.IO events

Connect to the same host/port as the REST API (default `http://localhost:5000`).
The server does not require any client-emitted events to start receiving
broadcasts — just connect and listen.

### `sensor_update`
Emitted whenever a new sensor reading is stored (via `/api/simulation`).

```json
{
  "location_id": 1,
  "rainfall": 85,
  "soil_moisture": 82,
  "river_level": 75,
  "humidity": 91,
  "temperature": 24,
  "timestamp": "2026-09-06T10:00:00"
}
```

### `prediction_update`
Emitted whenever a new prediction is computed (via `/api/predictions` or `/api/simulation`).

```json
{
  "location_id": 1,
  "risk_score": 86,
  "risk_level": "HIGH",
  "confidence": 0.89,
  "lead_time_minutes": 42
}
```

### `new_alert`

> Scenario-generated alerts are broadcast on this same channel with
> `"source": "MANUAL_SCENARIO"` and a `scenario_id`. Clients should route
> those to the scenario alert view rather than the seeded network feed, to
> avoid rendering the same alert twice.
Emitted whenever a new alert is generated (automatically on risk escalation,
or manually via `POST /api/alerts`).

```json
{
  "id": 10,
  "location_id": 1,
  "severity": "CRITICAL",
  "risk_score": 92,
  "message": "Critical flash flood risk detected",
  "status": "ACTIVE"
}
```

**These event names (`sensor_update`, `prediction_update`, `new_alert`) and
their payload shapes are a fixed contract with the frontend and must not be
renamed.**

---

## System health check

### `GET /health` (not under `/api`)

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "flood-prediction-backend",
    "timestamp": "2026-09-07T05:00:00.000Z",
    "ml_service": { "status": "ok", "model_loaded": true, "note": "..." }
  }
}
```


## Manual AI Disaster Check

> **Superseded.** This endpoint now requires a `location` object and returns
> a full **active disaster scenario** rather than a bare prediction. See
> [`POST /api/predictions/manual-disaster`](#post-apipredictionsmanual-disaster)
> in the *Active Disaster Scenario endpoints* section above for the current
> request/response contract, and `INTEGRATION_ARCHITECTURE.md` for how the
> scenario propagates to the Risk Map, AI Predictions, Alerts, Simulation
> and Evacuation modules.

> The manual classifier is trained on synthetic prototype labels. It must not
> be presented as a validated operational disaster warning model. Replace the
> prototype training data/labels with validated labelled observations before
> operational use.
