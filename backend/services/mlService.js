const axios = require('axios');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = Number(process.env.ML_SERVICE_TIMEOUT_MS) || 5000;

const client = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: TIMEOUT_MS,
});

/**
 * Custom error type so controllers can distinguish
 * "ML service down" from other errors and respond gracefully.
 */
class MLServiceError extends Error {
  constructor(message, isTimeout = false, isUnavailable = false) {
    super(message);
    this.name = 'MLServiceError';
    this.isTimeout = isTimeout;
    this.isUnavailable = isUnavailable;
  }
}

/**
 * Calls the FastAPI /predict endpoint with the given feature set.
 * @param {object} features - matches the ML service's expected input schema.
 * @returns {Promise<{risk_score:number, risk_level:string, confidence:number, lead_time_minutes:number}>}
 */
async function getPrediction(features) {
  try {
    const response = await client.post('/predict', features);
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      throw new MLServiceError('ML service request timed out.', true, false);
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || !err.response) {
      throw new MLServiceError('ML service is unavailable.', false, true);
    }
    throw new MLServiceError(
      `ML service returned an error: ${err.response?.data?.detail || err.message}`,
      false,
      false
    );
  }
}


/**
 * Calls the FastAPI manual disaster classifier using the four
 * environmental values entered by the user.
 * @param {{rainfall:number, temperature:number, humidity:number, soil_moisture:number}} input
 */
async function getManualDisasterPrediction(input) {
  try {
    const response = await client.post('/manual-disaster-predict', input);
    return response.data;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      throw new MLServiceError('ML service request timed out.', true, false);
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || !err.response) {
      throw new MLServiceError('ML service is unavailable.', false, true);
    }
    throw new MLServiceError(
      `ML service returned an error: ${err.response?.data?.detail || err.message}`,
      false,
      false
    );
  }
}

async function checkHealth() {
  try {
    const response = await client.get('/health', { timeout: 2000 });
    return response.data;
  } catch (err) {
    return { status: 'unavailable', error: err.message };
  }
}

module.exports = { getPrediction, getManualDisasterPrediction, checkHealth, MLServiceError };
