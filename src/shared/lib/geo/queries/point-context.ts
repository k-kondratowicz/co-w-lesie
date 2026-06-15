import type { PrismaClient } from '@prisma/client';
import { FOREST_COVERAGE_BBOX, isWithinBbox, POLAND_BBOX } from '../bbox';

// Point context: combines in-forest, fire-hazard and entry-ban checks. The spatial work is
// sub-millisecond, so all three run in ONE query (one DB round-trip - the real cost in prod).

export type PointContextRow = {
  in_forest: boolean;
  fire_degree: number | null;
  fire_updated_at: Date | null;
  ban_reason: string | null;
  ban_until: Date | null;
  has_ban: boolean;
};

export type PointContext = {
  inForest: { status: 'IN' | 'OUT' | 'UNKNOWN' };
  fire: { status: 'OK' | 'UNKNOWN'; degree: 0 | 1 | 2 | 3 | null; updatedAt?: string };
  entryBan: { status: 'BAN' | 'NONE' | 'UNKNOWN'; reason?: string; until?: string };
};

export async function queryPointContext(prisma: PrismaClient, lng: number, lat: number): Promise<PointContextRow> {
  const rows = await prisma.$queryRaw<PointContextRow[]>`
    WITH pt AS (SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) AS g)
    SELECT
      EXISTS(SELECT 1 FROM forest_area f WHERE ST_Intersects(f.geom, pt.g)) AS in_forest,
      fz.degree AS fire_degree,
      fz.updated_at AS fire_updated_at,
      b.reason AS ban_reason,
      b.until AS ban_until,
      COALESCE(b.matched, false) AS has_ban
    FROM pt
    LEFT JOIN LATERAL (
      SELECT degree, updated_at FROM fire_hazard_zone fz
      WHERE ST_Intersects(fz.geom, pt.g)
      ORDER BY degree DESC LIMIT 1
    ) fz ON true
    LEFT JOIN LATERAL (
      SELECT reason, until, true AS matched FROM forest_entry_ban b
      WHERE ST_Intersects(b.geom, pt.g) AND (b.until IS NULL OR b.until > now())
      LIMIT 1
    ) b ON true
  `;
  return rows[0];
}

/**
 * Pure mapping from the raw row to the public contract. Applies the safety rule: outside our
 * imported coverage, signals are UNKNOWN (never silently "OUT"/"NONE"). Fire and entry bans
 * are nationwide data, so they only need the point to be within Poland.
 */
export function buildPointContext(row: PointContextRow, lng: number, lat: number): PointContext {
  const inPoland = isWithinBbox(POLAND_BBOX, lng, lat);
  const inForestCoverage = isWithinBbox(FOREST_COVERAGE_BBOX, lng, lat);

  const inForest: PointContext['inForest'] = !inForestCoverage ? { status: 'UNKNOWN' } : { status: row.in_forest ? 'IN' : 'OUT' };

  const fire: PointContext['fire'] =
    inPoland && row.fire_degree !== null
      ? {
          status: 'OK',
          degree: row.fire_degree as 0 | 1 | 2 | 3,
          updatedAt: row.fire_updated_at?.toISOString(),
        }
      : { status: 'UNKNOWN', degree: null };

  let entryBan: PointContext['entryBan'];
  if (!inPoland) {
    entryBan = { status: 'UNKNOWN' };
  } else if (row.has_ban) {
    entryBan = { status: 'BAN', reason: row.ban_reason ?? undefined, until: row.ban_until?.toISOString() };
  } else {
    entryBan = { status: 'NONE' };
  }

  return { inForest, fire, entryBan };
}
