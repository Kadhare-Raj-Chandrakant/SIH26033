/**
 * Haversine and Highway Bézier Route Fallback Generator
 * Generates realistic 7-point curved transit corridors when upstream OSRM is unreachable.
 */

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lon, lat] format per GeoJSON standard
}

export interface RouteGeometryResult {
  geometry: GeoJsonLineString;
  distanceKm: number;
  durationHours: number;
  source: 'osrm' | 'cached' | 'fallback';
}

/**
 * Great-circle distance between two points in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generate a 7-point realistic curved highway corridor between two coordinates.
 * Incorporates slight perpendicular sinusoidal deflection so it follows natural Indian transport corridors.
 */
export function generate7PointFallbackRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
): RouteGeometryResult {
  const straightKm = calculateHaversineDistanceKm(
    originLat,
    originLon,
    destLat,
    destLon,
  );
  // Real road distances are typically 1.25x to 1.35x straight-line flight distances in India
  const roadDistanceKm = Math.round(straightKm * 1.28 * 10) / 10;
  // Estimated truck speed with toll/checkpoints ~ 45 km/h
  const durationHours = Math.round((roadDistanceKm / 45) * 10) / 10;

  const pointsCount = 7;
  const coordinates: [number, number][] = [];

  // Perpendicular vector for arc curvature
  const dLat = destLat - originLat;
  const dLon = destLon - originLon;
  const perpLat = -dLon;
  const perpLon = dLat;
  const perpLen = Math.sqrt(perpLat * perpLat + perpLon * perpLon) || 1;

  // Gentle arc amplitude: max ~3% of distance, capped
  const arcScale = Math.min(0.04, Math.max(0.015, straightKm * 0.00005));

  for (let i = 0; i < pointsCount; i++) {
    const t = i / (pointsCount - 1);
    // Base linear interpolation
    let lat = originLat + t * dLat;
    let lon = originLon + t * dLon;

    // Smooth sinusoidal curve for midpoint (t=0.5 peak)
    if (i > 0 && i < pointsCount - 1) {
      const curveWeight = Math.sin(t * Math.PI);
      lat += (perpLat / perpLen) * (straightKm * arcScale) * curveWeight;
      lon += (perpLon / perpLen) * (straightKm * arcScale) * curveWeight;
    }

    // GeoJSON coordinates are [lon, lat]
    coordinates.push([Math.round(lon * 10000) / 10000, Math.round(lat * 10000) / 10000]);
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates,
    },
    distanceKm: roadDistanceKm,
    durationHours,
    source: 'fallback',
  };
}
