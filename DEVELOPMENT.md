# DEVELOPMENT.md

Detailed setup, configuration, demo scenario, and troubleshooting guide for
developers working on the backend/ML/simulator side of this project.

## Prerequisites

| Tool     | Version   | Check with           |
|----------|-----------|------------------------|
| Node.js  | 18+       | `node -v`              |
| npm      | 9+        | `npm -v`                |
| Python   | 3.10+     | `python --version`      |
| pip      | latest    | `pip --version`         |
| MySQL    | 8.0+      | `mysql --version`       |

## 1. Database setup

### Windows

```bash
cd database
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

If `mysql` isn't on your PATH, use the full binary path, e.g.:

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < schema.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < seed.sql
```

### macOS / Linux

```bash
cd database
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

This creates the `flood_prediction` database, 6 tables, and seeds 20 demo
villages, 20 safe zones, baseline sensor readings, and synthetic historical
events. Re-run both scripts any time to reset to a clean state (`schema.sql`
drops and recreates the database).

## 2. ML service setup

```bash
cd ml-service
pip install -r requirements.txt
```

On Windows, if `pip` isn't recognized, try `python -m pip install -r requirements.txt`.

### Train the model

```bash
python train.py
```

Expected output includes evaluation metrics (MAE/RMSE/R²) and confirmation
that `models/flood_model.joblib` and `models/feature_list.json` were saved.
A pre-trained model is already committed to `ml-service/models/`, so this
step is optional unless you want to regenerate it.

### Run the service

```bash
uvicorn main:app --reload --port 8000
```

Verify it's up:

```bash
curl http://localhost:8000/health
```

## 3. Backend setup

```bash
cd backend
copy .env.example .env        # Windows
:: cp .env.example .env       # macOS/Linux
npm install
```

Edit `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=flood_prediction
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:3000
ML_SERVICE_TIMEOUT_MS=5000
```

Run in dev mode (auto-restart on changes):

```bash
npm run dev
```

Or plain:

```bash
npm start
```

Verify:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/locations
```

## 4. Simulator setup

```bash
cd simulator
npm install
```

Run the scripted demo flow:

```bash
node sensorSimulator.js demo 1
```

Or continuous background simulation across all locations:

```bash
node sensorSimulator.js
```

Or a single one-shot reading:

```bash
node sensorSimulator.js 5 EXTREME_RAIN
```

## Environment variables reference

### `backend/.env`

| Variable                | Default                   | Purpose                                          |
|--------------------------|----------------------------|----------------------------------------------------|
| `PORT`                   | `5000`                     | Backend HTTP/Socket.IO port                        |
| `DB_HOST`                | `localhost`                | MySQL host                                          |
| `DB_PORT`                | `3306`                     | MySQL port                                          |
| `DB_USER`                | `root`                     | MySQL user                                          |
| `DB_PASSWORD`            | *(empty)*                  | MySQL password — never commit a real value          |
| `DB_NAME`                | `flood_prediction`         | Database name                                       |
| `ML_SERVICE_URL`         | `http://localhost:8000`    | Base URL of the FastAPI ML service                  |
| `CORS_ORIGIN`            | `http://localhost:3000`    | Allowed frontend origin(s) for CORS                 |
| `ML_SERVICE_TIMEOUT_MS`  | `5000`                     | Timeout before treating the ML service as unavailable |

### `ml-service/.env`

| Variable | Default | Purpose            |
|----------|---------|----------------------|
| `PORT`   | `8000`  | FastAPI service port |

### `simulator/.env`

| Variable                  | Default                  | Purpose                                         |
|-----------------------------|----------------------------|---------------------------------------------------|
| `BACKEND_URL`               | `http://localhost:5000`   | Backend base URL the simulator posts to             |
| `UPDATE_INTERVAL_MS`        | `6000`                    | Interval between ticks in continuous mode           |
| `DEMO_STAGE_DURATION_MS`    | `8000`                    | Pause between stages in scripted demo mode          |

## Demo scenario (recommended run-through)

1. Start MySQL, seed the database.
2. Start the ML service (`uvicorn main:app --reload --port 8000`).
3. Start the backend (`npm run dev` in `backend/`).
4. (Optional) Start the frontend dashboard, connected via Socket.IO.
5. In a fourth terminal, run:
   ```bash
   node sensorSimulator.js demo 1
   ```
6. Watch the story unfold:
   - **NORMAL** → low sensor values → LOW risk, no alert.
   - **HEAVY_RAIN** → rising values → risk climbs toward MODERATE/HIGH.
   - **EXTREME_RAIN** → high rainfall/soil/river values → HIGH/CRITICAL risk.
   - **CRITICAL** → extreme values → CRITICAL risk, an alert is generated,
     stored in the `alerts` table, and broadcast via the `new_alert`
     Socket.IO event with a recommended evacuation action.
7. Confirm via API:
   ```bash
   curl http://localhost:5000/api/alerts?status=ACTIVE
   curl http://localhost:5000/api/predictions
   curl http://localhost:5000/api/statistics
   ```

## Troubleshooting

**"connect ECONNREFUSED 127.0.0.1:3306" from the backend**
MySQL isn't running or `.env` credentials are wrong. The backend still
starts and serves `/health`, but any DB-backed route (`/api/locations`,
etc.) returns a JSON `{"success": false, ...}` error rather than crashing.
Start MySQL and double-check `.env`.

**"ML prediction service is currently unavailable" (HTTP 503)**
The FastAPI service (`ml-service`) isn't running, or `ML_SERVICE_URL` in
`backend/.env` doesn't match where it's listening. Start it with
`uvicorn main:app --reload --port 8000` and confirm `curl http://localhost:8000/health`.

**"Model is not loaded" (HTTP 503 from the ML service itself)**
Run `python train.py` inside `ml-service/` at least once to produce
`models/flood_model.joblib`, then restart `uvicorn`.

**Simulator can't fetch locations ("Could not fetch locations from backend")**
The backend isn't running, or the database hasn't been seeded yet (so
`GET /api/locations` returns an empty array). Seed the DB and confirm the
backend is reachable at `BACKEND_URL`.

**CORS errors from the frontend**
Set `CORS_ORIGIN` in `backend/.env` to your frontend's exact origin (e.g.
`http://localhost:3000`), then restart the backend.

**Socket.IO client not receiving events**
Confirm the frontend connects to the backend's port (default `5000`), not
the ML service's port (`8000`). Event names are exactly `sensor_update`,
`prediction_update`, and `new_alert` — see `API.md`.

**Port already in use**
Change `PORT` in the relevant `.env` file, or stop the process using that
port (`netstat -ano | findstr :5000` on Windows, `lsof -i :5000` on
macOS/Linux).
