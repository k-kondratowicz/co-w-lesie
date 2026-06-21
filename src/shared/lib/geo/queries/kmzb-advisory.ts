import { Prisma, type PrismaClient } from '@prisma/client';
import { KMZB_ADVISORY_TYPES, KMZB_SINCE_DAYS, KMZB_TYPE_GRASS_BURNING, KMZB_TYPE_POACHING } from '@/shared/lib/kmzb/config';

// Counts of the danger-relevant KMZB incident types within a radius. Feeds an informational
// advisory in the safety assistant, never the risk score (see KMZB_ADVISORY_TYPES). The created_at
// filter keeps this read self-consistent ("last week") even if a sync leaves older rows around -
// it does not rely on the sync's truncate window alone.

export type KmzbAdvisory = { poaching: number; grassBurning: number };

export async function queryKmzbAdvisory(
  prisma: PrismaClient,
  lng: number,
  lat: number,
  radiusMeters: number,
): Promise<KmzbAdvisory> {
  const rows = await prisma.$queryRaw<{ type: string; count: number }[]>`
    SELECT "type", COUNT(*)::int AS count
    FROM "kmzb_report"
    WHERE "type" IN (${Prisma.join([...KMZB_ADVISORY_TYPES])})
      AND "created_at" > NOW() - (${KMZB_SINCE_DAYS} || ' days')::interval
      AND ST_DWithin("geom"::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    GROUP BY "type"
  `;

  const byType = new Map(rows.map((row) => [row.type, row.count]));

  return {
    poaching: byType.get(KMZB_TYPE_POACHING) ?? 0,
    grassBurning: byType.get(KMZB_TYPE_GRASS_BURNING) ?? 0,
  };
}
