# Database — Flash Flood Prediction System

MySQL 8+ schema and seed data for the hyper-local flash flood prediction prototype.

## ⚠️ Data Disclaimer

All data in `seed.sql` (village names, coordinates, population, sensor baselines,
historical events) is **synthetic / demo data** created for the SIH 2026 prototype.
It does **not** represent verified records from IMD, NDMA, Survey of India, or any
state disaster management authority. Every demo location is flagged with
`is_demo_data = TRUE` / `is_synthetic = TRUE` in the schema so the frontend can
clearly label it as such if desired.

## Setup (Windows / macOS / Linux)

1. Make sure MySQL Server (8.x) is installed and running.
2. Open a terminal in the `database/` folder.
3. Run:

```bash
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

On Windows (if `mysql` is not on PATH, use the full path, e.g.
`"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`):

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < schema.sql
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < seed.sql
```

This creates the `flood_prediction` database with 6 tables and inserts 20 demo
villages, 20 safe zones, baseline sensor readings, and synthetic historical events.

## Tables

| Table              | Purpose                                             |
|--------------------|------------------------------------------------------|
| `locations`         | Villages/wards being monitored                       |
| `sensor_data`        | IoT sensor readings (rainfall, soil moisture, etc.)   |
| `historical_events`  | Synthetic past disaster records                       |
| `predictions`        | ML + rule-engine risk output history                  |
| `alerts`             | Generated warnings                                    |
| `safe_zones`         | Evacuation shelter locations                          |

## Resetting the database

`schema.sql` starts with `DROP DATABASE IF EXISTS flood_prediction;`, so re-running
both scripts gives you a clean, fully reseeded database at any time.
