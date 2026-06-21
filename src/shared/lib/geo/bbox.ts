// Canonical bounding boxes (EPSG:4326), ordered [minLng, minLat, maxLng, maxLat].

import { z } from 'zod';

export type Bbox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

// Parses a "minLng,minLat,maxLng,maxLat" viewport query param into a validated tuple. Shared by
// every bbox-driven route (/api/reports, /api/bans, /api/kmzb) so they agree on what's valid.
export const bboxParamSchema = z
  .string()
  .transform((value) => value.split(',').map(Number))
  .pipe(z.tuple([z.number(), z.number(), z.number(), z.number()]))
  .refine(([minLng, minLat, maxLng, maxLat]) => minLng < maxLng && minLat < maxLat, 'Nieprawidłowy bbox');

export const POLAND_BBOX: Bbox = [14.07, 49.0, 24.16, 54.9];

export const MALOPOLSKA_BBOX: Bbox = [19.08, 49.07, 21.55, 50.59];

/**
 * Region currently loaded into forest_area. Outside it, in-forest detection must report
 * UNKNOWN (no data ≠ "not in forest"). Set to POLAND_BBOX after the country-wide seed
 * (455k compartments across all voivodeships).
 */
export const FOREST_COVERAGE_BBOX: Bbox = POLAND_BBOX;

export function isWithinBbox([minLng, minLat, maxLng, maxLat]: Bbox, lng: number, lat: number): boolean {
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}
