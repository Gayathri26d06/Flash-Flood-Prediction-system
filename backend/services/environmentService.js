const axios = require('axios');

const OPEN_METEO_FORECAST_URL = process.env.OPEN_METEO_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_FLOOD_URL = process.env.OPEN_METEO_FLOOD_URL || 'https://flood-api.open-meteo.com/v1/flood';

class EnvironmentServiceError extends Error {
  constructor(message, isUnavailable = false) {
    super(message);
    this.name = 'EnvironmentServiceError';
    this.isUnavailable = isUnavailable;
  }
}

/**
 * Fetches current weather + soil moisture from Open-Meteo for a
 * given lat/lon. Open-Meteo aggregates various open weather models
 * (NOT the India Meteorological Department / IMD).
 */
async function fetchWeatherAndSoil(lat, lon) {
  const response = await axios.get(OPEN_METEO_FORECAST_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation',
        'rain',
        'soil_moisture_0_to_1cm',
      ].join(','),
      hourly: ['precipitation', 'soil_moisture_0_to_1cm'].join(','),
      past_days: 1,
      forecast_days: 1,
      timezone: 'auto',
    },
    timeout: 8000,
  });
  return response.data;
}

/**
 * Fetches river discharge (m^3/s) from Open-Meteo's Global Flood
 * Awareness System (GloFAS) integration. This is DISCHARGE, not a
 * calibrated official river GAUGE LEVEL — must never be presented
 * to the user as "river_level".
 */
async function fetchRiverDischarge(lat, lon) {
  const response = await axios.get(OPEN_METEO_FLOOD_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      daily: 'river_discharge',
      forecast_days: 1,
    },
    timeout: 8000,
  });
  const daily = response.data?.daily;
  const discharge = daily?.river_discharge?.[0];
  return discharge !== undefined && discharge !== null ? Number(discharge) : null;
}

/**
 * Aggregates all available environmental data for a coordinate.
 * Never fabricates official river gauge levels — river_level is
 * always null with a clear "pending integration" label unless a
 * real CWC (Central Water Commission) feed is wired up.
 */
async function getEnvironmentalData(lat, lon) {
  const result = {
    latitude: Number(lat),
    longitude: Number(lon),
    weather: {
      temperature: null,
      humidity: null,
      rainfall: null,
      precipitation: null,
    },
    soil: {
      soil_moisture: null,
    },
    river: {
      river_level: null,
      river_level_status: 'Not connected - CWC integration pending',
      river_discharge: null,
    },
    sources: {
      weather: 'Open-Meteo',
      soil_moisture: 'Open-Meteo',
      river_discharge: 'Open-Meteo GloFAS',
      river_level: 'Not connected - CWC integration pending',
    },
    warnings: [],
    fetched_at: new Date().toISOString(),
  };

  try {
    const weatherData = await fetchWeatherAndSoil(lat, lon);
    const current = weatherData?.current || {};
    result.weather.temperature = current.temperature_2m ?? null;
    result.weather.humidity = current.relative_humidity_2m ?? null;
    result.weather.precipitation = current.precipitation ?? current.rain ?? null;
    result.weather.rainfall = current.rain ?? current.precipitation ?? null;
    // soil_moisture_0_to_1cm from Open-Meteo is a volumetric fraction (m3/m3);
    // convert to an approximate percentage for UI consistency with the rest
    // of the app's soil_moisture (0-100) convention.
    const rawSoil = current.soil_moisture_0_to_1cm;
    result.soil.soil_moisture = rawSoil !== undefined && rawSoil !== null ? Math.round(rawSoil * 100) : null;
  } catch (err) {
    result.warnings.push('Weather/soil data unavailable from Open-Meteo: ' + err.message);
  }

  try {
    result.river.river_discharge = await fetchRiverDischarge(lat, lon);
  } catch (err) {
    result.warnings.push('River discharge data unavailable from Open-Meteo GloFAS: ' + err.message);
  }

  return result;
}

module.exports = { getEnvironmentalData, fetchWeatherAndSoil, fetchRiverDischarge, EnvironmentServiceError };
