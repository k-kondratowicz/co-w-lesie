import { DUPLICATE_BUFFER_MIN_METERS, DUPLICATE_BUFFER_RADIUS_FRACTION } from '@/features/saved-areas/constants';
import type { SavedArea } from '@/features/saved-areas/types';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';

export function duplicateBufferMeters(radiusMeters: number): number {
  return Math.max(DUPLICATE_BUFFER_MIN_METERS, radiusMeters * DUPLICATE_BUFFER_RADIUS_FRACTION);
}

// Client-side twin of the server's findDuplicateArea, so the save button can show "already saved"
// before a request and a jittered GPS re-save does not look saveable. Same rule: identical radius,
// center within the size-scaled buffer (haversine here vs PostGIS geography server-side - both read
// the same DUPLICATE_BUFFER_* constants, so they cannot drift on the threshold).
export function findDuplicateSavedArea(
  areas: SavedArea[],
  point: { lat: number; lng: number },
  radiusMeters: number,
): SavedArea | undefined {
  const buffer = duplicateBufferMeters(radiusMeters);

  return areas.find(
    (area) => area.radiusMeters === radiusMeters && distanceMeters(area.lng, area.lat, point.lng, point.lat) <= buffer,
  );
}
