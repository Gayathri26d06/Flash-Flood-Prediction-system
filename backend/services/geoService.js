const axios = require('axios');

const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODER_USER_AGENT || 'FlashFloodPredictionSystem/1.0 (contact: demo@example.com)';

class GeoServiceError extends Error {
  constructor(message, isUnavailable = false) {
    super(message);
    this.name = 'GeoServiceError';
    this.isUnavailable = isUnavailable;
  }
}

/**
 * Searches for arbitrary locations by free-text query using the
 * OpenStreetMap Nominatim geocoding service. NOT limited to any
 * hardcoded set of locations — supports any place name worldwide.
 *
 * @param {string} query - free-text search, e.g. "Munnar"
 * @param {number} limit - max results to return
 * @returns {Promise<Array<{name, latitude, longitude, address, place_id, type}>>}
 */
async function searchLocations(query, limit = 8) {
  if (!query || !String(query).trim()) {
    return [];
  }

  try {
    const response = await axios.get(`${NOMINATIM_URL}/search`, {
      params: {
        q: query,
        format: 'jsonv2',
        addressdetails: 1,
        limit,
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });

    return (response.data || []).map((item) => ({
      place_id: item.place_id,
      name: item.display_name.split(',')[0],
      display_name: item.display_name,
      address: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      type: item.type,
      class: item.class,
      state: item.address?.state || null,
      district: item.address?.state_district || item.address?.county || null,
      country: item.address?.country || null,
    }));
  } catch (err) {
    throw new GeoServiceError(
      `Location search service unavailable: ${err.message}`,
      true
    );
  }
}

/**
 * Reverse-geocodes a lat/lon pair into a human-readable address.
 * Used as a fallback when a location is selected via coordinates only.
 */
async function reverseGeocode(lat, lon) {
  try {
    const response = await axios.get(`${NOMINATIM_URL}/reverse`, {
      params: { lat, lon, format: 'jsonv2' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    const item = response.data;
    if (!item) return null;
    return {
      name: item.display_name?.split(',')[0] || `${lat}, ${lon}`,
      display_name: item.display_name,
      address: item.display_name,
      latitude: Number(item.lat ?? lat),
      longitude: Number(item.lon ?? lon),
      state: item.address?.state || null,
      district: item.address?.state_district || item.address?.county || null,
      country: item.address?.country || null,
    };
  } catch (err) {
    return null;
  }
}

module.exports = { searchLocations, reverseGeocode, GeoServiceError };
