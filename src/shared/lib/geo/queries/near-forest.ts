import type { PrismaClient } from '@prisma/client';

// Reports are only meaningful near forests. We accept a tolerance buffer (GPS drift, forest
// edges, trailheads, and woods not in the BDL compartment set) rather than a strict
// in-polygon test. Default 500 meters.
export const REPORT_FOREST_BUFFER_METERS = 500;

/**
 * True if the point is within `bufferMeters` of any forest_area polygon. The `&&` against an
 * expanded envelope uses the geometry GIST index to prefilter; the exact metre distance is
 * then checked on the few candidates via a geography cast.
 */
export async function isPointNearForest(prisma: PrismaClient, lng: number, lat: number, bufferMeters: number): Promise<boolean> {
  // Generous degree padding for the index prefilter; the exact ST_DWithin below is authoritative.
  const degreePadding = bufferMeters / 50_000;
  const rows = await prisma.$queryRaw<{ near: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM forest_area
      WHERE geom && ST_Expand(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${degreePadding})
        AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${bufferMeters})
    ) AS near
  `;
  return rows[0]?.near ?? false;
}
