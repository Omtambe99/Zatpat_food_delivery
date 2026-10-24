/**
 * Extracts { lat, lon } from various point formats:
 * - GeoJSON Point { type: "Point", coordinates: [lon, lat] }
 * - Array [lon, lat]
 * - Object { latitude, longitude } or { lat, lon } or { lat, lng }
 */
export const extractCoords = (point) => {
  if (!point) return null;
  if (Array.isArray(point) && point.length >= 2) {
    return { lat: Number(point[1]), lon: Number(point[0]) };
  }
  if (point.coordinates && Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
    return { lat: Number(point.coordinates[1]), lon: Number(point.coordinates[0]) };
  }
  const lat = point.latitude ?? point.lat;
  const lon = point.longitude ?? point.lon ?? point.lng;
  if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
    return { lat: Number(lat), lon: Number(lon) };
  }
  return null;
};

/**
 * Calculates distance in meters between two lat/lon coordinates using the Haversine formula.
 */
export const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Checks whether point `a` is within `meters` of point `b`.
 */
export const isWithinRadius = (a, b, meters) => {
  const c1 = extractCoords(a);
  const c2 = extractCoords(b);
  if (!c1 || !c2) return false;
  return haversineMeters(c1.lat, c1.lon, c2.lat, c2.lon) <= meters;
};
