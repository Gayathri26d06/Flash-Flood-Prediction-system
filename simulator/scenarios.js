/**
 * scenarios.js
 * ============
 * Defines the value ranges the virtual IoT sensor simulator uses to
 * generate rainfall / soil_moisture / river_level / humidity /
 * temperature readings for each named scenario.
 *
 * These are illustrative demo ranges only, tuned to comfortably
 * trigger the corresponding risk bands in the hybrid risk engine
 * during a live demo (NORMAL -> LOW/MODERATE, ..., CRITICAL -> CRITICAL).
 */

const SCENARIOS = {
  NORMAL: {
    rainfall: [10, 35],
    soil_moisture: [25, 45],
    river_level: [15, 35],
    humidity: [55, 72],
    temperature: [20, 28],
  },
  HEAVY_RAIN: {
    rainfall: [45, 70],
    soil_moisture: [50, 68],
    river_level: [40, 58],
    humidity: [72, 85],
    temperature: [18, 24],
  },
  EXTREME_RAIN: {
    rainfall: [90, 130],
    soil_moisture: [80, 93],
    river_level: [75, 90],
    humidity: [88, 96],
    temperature: [16, 22],
  },
  RIVER_RISE: {
    rainfall: [40, 65],
    soil_moisture: [55, 72],
    river_level: [82, 96],
    humidity: [78, 88],
    temperature: [17, 23],
  },
  CRITICAL: {
    rainfall: [120, 160],
    soil_moisture: [90, 98],
    river_level: [92, 100],
    humidity: [92, 99],
    temperature: [15, 20],
  },
};

const SCENARIO_NAMES = Object.keys(SCENARIOS);

/** Returns a random float within [min, max], rounded to 1 decimal place. */
function randomInRange([min, max]) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

/**
 * Generates a full sensor reading object for the given scenario.
 * @param {string} scenario - one of SCENARIO_NAMES
 * @returns {{rainfall:number, soil_moisture:number, river_level:number, humidity:number, temperature:number}}
 */
function generateReading(scenario) {
  const ranges = SCENARIOS[scenario];
  if (!ranges) {
    throw new Error(`Unknown scenario: ${scenario}. Valid scenarios: ${SCENARIO_NAMES.join(', ')}`);
  }
  return {
    rainfall: randomInRange(ranges.rainfall),
    soil_moisture: randomInRange(ranges.soil_moisture),
    river_level: randomInRange(ranges.river_level),
    humidity: randomInRange(ranges.humidity),
    temperature: randomInRange(ranges.temperature),
  };
}

module.exports = { SCENARIOS, SCENARIO_NAMES, generateReading, randomInRange };
