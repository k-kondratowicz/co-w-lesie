// Pure geodesic circle as a GeoJSON Polygon, for drawing the risk radius on the map.
// Uses the spherical destination-point formula so it stays accurate at Polish latitudes.

import { EARTH_RADIUS_M, toDegrees, toRadians } from './units';

export function circlePolygon(lng: number, lat: number, radiusMeters: number, steps = 64): GeoJSON.Polygon {
  const angularDistance = radiusMeters / EARTH_RADIUS_M;
  const centerLat = toRadians(lat);
  const centerLng = toRadians(lng);
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const pointLat = Math.asin(
      Math.sin(centerLat) * Math.cos(angularDistance) + Math.cos(centerLat) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLng =
      centerLng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLat),
        Math.cos(angularDistance) - Math.sin(centerLat) * Math.sin(pointLat),
      );
    ring.push([toDegrees(pointLng), toDegrees(pointLat)]);
  }

  return { type: 'Polygon', coordinates: [ring] };
}
