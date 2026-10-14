const safeZoneModel = require('../models/safeZoneModel');
const { asyncHandler } = require('../middleware/errorHandler');

function serializeSafeZone(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    capacity: row.capacity,
    location_id: row.location_id,
  };
}

// GET /api/safe-zones — supports optional ?location_id= filter
const getAllSafeZones = asyncHandler(async (req, res) => {
  const { location_id } = req.query;
  const rows = location_id
    ? await safeZoneModel.getSafeZonesByLocation(location_id)
    : await safeZoneModel.getAllSafeZones();
  res.json({ success: true, data: rows.map(serializeSafeZone) });
});

// --- Dynamic (arbitrary lat/lon) safe-zone recommendations ---------------
// The seeded `safe_zones` table only covers the demo villages/wards that
// ship with the DB. For an arbitrary searched location we do not have a
// real evacuation-center database, so we generate clearly-labelled
// PROTOTYPE/DEMO candidate zones relative to the given coordinates rather
// than presenting them as official evacuation centers.

const EARTH_RADIUS_KM = 6371;

function destinationPoint(lat, lon, bearingDeg, distanceKm) {
  const rad = Math.PI / 180;
  const bearing = bearingDeg * rad;
  const lat1 = lat * rad;
  const lon1 = lon * rad;
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { latitude: lat2 / rad, longitude: (((lon2 / rad) + 540) % 360) - 180 };
}

const PROTOTYPE_ZONE_TEMPLATES = [
  { label: 'Community Relief Center (higher ground, N)', bearing: 15, distanceKm: 3.2, capacity: 400 },
  { label: 'Government School Shelter (E)', bearing: 100, distanceKm: 4.8, capacity: 250 },
  { label: 'District Sports Complex (S)', bearing: 190, distanceKm: 5.5, capacity: 600 },
  { label: 'Elevated Highway Junction Shelter (W)', bearing: 275, distanceKm: 4.1, capacity: 300 },
];

// GET /api/safe-zones/dynamic?lat=<lat>&lon=<lon>
const getDynamicSafeZones = asyncHandler(async (req, res, next) => {
  const { lat, lon } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    const err = new Error('"lat" and "lon" query parameters are required and must be numbers.');
    err.statusCode = 400;
    return next(err);
  }

  const zones = PROTOTYPE_ZONE_TEMPLATES.map((tpl, idx) => {
    const point = destinationPoint(latitude, longitude, tpl.bearing, tpl.distanceKm);
    return {
      id: `proto-${idx}`,
      name: tpl.label,
      latitude: point.latitude,
      longitude: point.longitude,
      distance: tpl.distanceKm,
      capacity: tpl.capacity,
      availability: Math.round(tpl.capacity * 0.6),
      is_prototype: true,
      data_label: 'Prototype/demo recommendation — not an official designated evacuation center',
    };
  }).sort((a, b) => a.distance - b.distance);

  res.json({
    success: true,
    data: zones,
    meta: {
      latitude,
      longitude,
      data_label: 'Prototype/demo recommendation — not an official designated evacuation center',
    },
  });
});

module.exports = { getAllSafeZones, getDynamicSafeZones };
