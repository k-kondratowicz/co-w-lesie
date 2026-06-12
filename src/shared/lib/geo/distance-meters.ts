// Great-circle distance between two points in metres (haversine). Pure and testable.

import { EARTH_RADIUS_M, toRadians } from './units';

export function distanceMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  // Haversine: square of half the chord length between the points.
  const halfChordSquared =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(halfChordSquared)));
}
