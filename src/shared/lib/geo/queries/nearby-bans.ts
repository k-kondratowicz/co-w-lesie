import type { PrismaClient } from '@prisma/client';

export type NearbyBans = { count: number; nearestMeters: number | null };

/**
 * Active entry bans within `radiusMeters` of the point that do NOT contain it - i.e. bans that
 * are nearby but not where you're standing. Used to warn even when the point itself is allowed.
 */
export async function queryNearbyBans(prisma: PrismaClient, lng: number, lat: number, radiusMeters: number): Promise<NearbyBans> {
  const rows = await prisma.$queryRaw<{ count: number; nearest: number | null }[]>`
    WITH pt AS (SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) AS g)
    SELECT
      count(*)::int AS count,
      min(ST_Distance(b.geom::geography, pt.g::geography))::int AS nearest
    FROM forest_entry_ban b, pt
    WHERE (b.until IS NULL OR b.until > now())
      AND ST_DWithin(b.geom::geography, pt.g::geography, ${radiusMeters})
      AND NOT ST_Intersects(b.geom, pt.g)
  `;
  return { count: rows[0]?.count ?? 0, nearestMeters: rows[0]?.nearest ?? null };
}
