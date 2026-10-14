/**
 * sensorSimulator.js
 * ==================
 * Virtual IoT sensor simulator for the Flash Flood Prediction System.
 *
 * Generates synthetic rainfall / soil_moisture / river_level / humidity /
 * temperature readings for one or more locations and POSTs them to the
 * backend's `POST /api/simulation` endpoint, which runs them through the
 * full pipeline (ML prediction -> hybrid risk engine -> alert generation
 * -> Socket.IO broadcast).
 *
 * USAGE
 * -----
 *   node sensorSimulator.js
 *     Continuous background mode: cycles all locations fetched from the
 *     backend, mostly NORMAL with occasional randomized weather events,
 *     updating every UPDATE_INTERVAL_MS.
 *
 *   node sensorSimulator.js demo [locationId]
 *     Scripted escalating DEMO FLOW for a single location (defaults to
 *     location 1): NORMAL -> HEAVY_RAIN -> EXTREME_RAIN -> CRITICAL,
 *     pausing between stages — ideal for a live judged demo.
 *
 *   node sensorSimulator.js <locationId> <SCENARIO>
 *     One-shot: sends a single reading for the given scenario
 *     (NORMAL | HEAVY_RAIN | EXTREME_RAIN | RIVER_RISE | CRITICAL)
 *     to the given location and exits.
 *
 * CONFIG (env vars, see .env or shell)
 *   BACKEND_URL           default: http://localhost:5000
 *   UPDATE_INTERVAL_MS    default: 6000 (continuous mode only)
 */

require('dotenv').config();
const axios = require('axios');
const { SCENARIO_NAMES, generateReading } = require('./scenarios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const UPDATE_INTERVAL_MS = Number(process.env.UPDATE_INTERVAL_MS) || 6000;
const DEMO_STAGE_DURATION_MS = Number(process.env.DEMO_STAGE_DURATION_MS) || 8000;

const client = axios.create({ baseURL: BACKEND_URL, timeout: 10000 });

function log(locationLabel, scenario, reading, result) {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] ${locationLabel} — scenario: ${scenario}`);
  console.log(
    `  Rainfall: ${reading.rainfall}  Soil Moisture: ${reading.soil_moisture}  River Level: ${reading.river_level}  Humidity: ${reading.humidity}  Temp: ${reading.temperature}`
  );
  if (result) {
    console.log(
      `  -> risk_score: ${result.risk_score}  risk_level: ${result.risk_level}  lead_time: ${result.lead_time_minutes}min  alert_generated: ${result.alert_generated}`
    );
  }
}

async function fetchLocations() {
  const res = await client.get('/api/locations');
  return res.data.data;
}

async function sendSimulation(locationId, scenario) {
  const reading = generateReading(scenario);
  const payload = { location_id: locationId, scenario, ...reading };

  try {
    const res = await client.post('/api/simulation', payload);
    return { reading, result: res.data.data };
  } catch (err) {
    const message = err.response?.data?.message || err.message;
    console.error(`  [ERROR] Simulation POST failed for location ${locationId}: ${message}`);
    return { reading, result: null };
  }
}

/** Continuous mode: cycles every location, mostly NORMAL with occasional random events. */
async function runContinuousMode() {
  console.log(`[simulator] Continuous mode. Backend: ${BACKEND_URL}. Interval: ${UPDATE_INTERVAL_MS}ms`);

  let locations;
  try {
    locations = await fetchLocations();
  } catch (err) {
    console.error(`[simulator] Could not fetch locations from backend (${BACKEND_URL}/api/locations): ${err.message}`);
    console.error('[simulator] Make sure the backend is running and reachable, then restart the simulator.');
    process.exit(1);
  }

  if (!locations.length) {
    console.error('[simulator] No locations found. Seed the database first (see database/seed.sql).');
    process.exit(1);
  }

  console.log(`[simulator] Loaded ${locations.length} locations. Starting simulation loop...`);

  const tick = async () => {
    for (const loc of locations) {
      // 80% chance NORMAL, 20% chance a random weather event, for variety.
      const scenario = Math.random() < 0.8
        ? 'NORMAL'
        : SCENARIO_NAMES[Math.floor(Math.random() * SCENARIO_NAMES.length)];

      const { reading, result } = await sendSimulation(loc.id, scenario);
      log(`${loc.name} (#${loc.id})`, scenario, reading, result);
    }
  };

  await tick();
  setInterval(tick, UPDATE_INTERVAL_MS);
}

/** Scripted demo flow: escalates a single location through the full risk range. */
async function runDemoMode(locationId) {
  const stages = ['NORMAL', 'HEAVY_RAIN', 'EXTREME_RAIN', 'CRITICAL'];
  console.log(`[simulator] DEMO FLOW mode for location ${locationId}. Backend: ${BACKEND_URL}`);
  console.log(`[simulator] Stages: ${stages.join(' -> ')} (${DEMO_STAGE_DURATION_MS}ms apart)\n`);

  for (const scenario of stages) {
    const { reading, result } = await sendSimulation(locationId, scenario);
    log(`Location #${locationId}`, scenario, reading, result);
    await new Promise((resolve) => setTimeout(resolve, DEMO_STAGE_DURATION_MS));
  }

  console.log('\n[simulator] Demo flow complete. Check the dashboard / alerts for the CRITICAL warning.');
}

/** One-shot single simulation call. */
async function runOneShot(locationId, scenario) {
  const normalizedScenario = scenario.toUpperCase();
  if (!SCENARIO_NAMES.includes(normalizedScenario)) {
    console.error(`[simulator] Unknown scenario "${scenario}". Valid: ${SCENARIO_NAMES.join(', ')}`);
    process.exit(1);
  }

  const { reading, result } = await sendSimulation(Number(locationId), normalizedScenario);
  log(`Location #${locationId}`, normalizedScenario, reading, result);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    await runContinuousMode();
    return;
  }

  if (args[0].toLowerCase() === 'demo') {
    const locationId = args[1] ? Number(args[1]) : 1;
    await runDemoMode(locationId);
    return;
  }

  if (args.length >= 2) {
    const [locationId, scenario] = args;
    await runOneShot(locationId, scenario);
    return;
  }

  console.log('Usage:');
  console.log('  node sensorSimulator.js                    # continuous mode, all locations');
  console.log('  node sensorSimulator.js demo [locationId]   # scripted escalating demo flow');
  console.log('  node sensorSimulator.js <locationId> <SCENARIO>  # one-shot reading');
  process.exit(1);
}

main().catch((err) => {
  console.error('[simulator] Fatal error:', err.message);
  process.exit(1);
});
