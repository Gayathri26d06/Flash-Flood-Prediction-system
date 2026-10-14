# Virtual IoT Sensor Simulator

Simulates rainfall, soil moisture, river level, humidity and temperature
readings for hilly villages and streams them to the backend's
`POST /api/simulation` endpoint, which runs the full pipeline (ML prediction
→ hybrid risk engine → alert generation → Socket.IO broadcast).

No physical hardware is involved — this is a **virtual** sensor network for
demo and development purposes.

## Setup

```bash
cd simulator
npm install
```

Copy `.env.example` to `.env` if you want to override defaults (backend URL,
update interval).

## Usage

### 1. Continuous mode (all locations)

```bash
node sensorSimulator.js
```

Cycles through every location returned by `GET /api/locations`, sending
mostly `NORMAL` readings with occasional randomized weather events, once
every `UPDATE_INTERVAL_MS` (default 6000ms). Good for populating the
dashboard with live-looking data over time.

### 2. Scripted demo flow (recommended for judging/demo day)

```bash
node sensorSimulator.js demo 1
```

Escalates a single location through:

```
NORMAL → HEAVY_RAIN → EXTREME_RAIN → CRITICAL
```

pausing `DEMO_STAGE_DURATION_MS` (default 8000ms) between stages, so you can
narrate the story live: calm conditions → rising rainfall → extreme rainfall
→ critical alert with recommended evacuation action. This directly matches
the project's documented demo flow.

### 3. One-shot single reading

```bash
node sensorSimulator.js 3 EXTREME_RAIN
```

Sends a single `EXTREME_RAIN`-range reading for location id `3` and exits.

Valid scenarios: `NORMAL`, `HEAVY_RAIN`, `EXTREME_RAIN`, `RIVER_RISE`, `CRITICAL`.

## Example output

```
[2026-09-07T10:00:00.000Z] Demo Village A - Munnar Hills (#1) — scenario: NORMAL
  Rainfall: 22.5  Soil Moisture: 38.1  River Level: 27.6  Humidity: 68.4  Temp: 23.1
  -> risk_score: 18  risk_level: LOW  lead_time: 0min  alert_generated: false

[2026-09-07T10:00:08.000Z] Location #1 — scenario: EXTREME_RAIN
  Rainfall: 112.4  Soil Moisture: 91.2  River Level: 88.7  Humidity: 94.0  Temp: 18.2
  -> risk_score: 93  risk_level: CRITICAL  lead_time: 32min  alert_generated: true
```

## Notes

- All values generated here are synthetic and clearly not real sensor
  hardware readings — see `scenarios.js` for the exact ranges per scenario.
- The simulator requires the backend to be running and reachable at
  `BACKEND_URL` (default `http://localhost:5000`) and the database to be
  seeded (see `database/seed.sql`) before it can find locations to simulate.
