import { Prisma, type PrismaClient } from '@prisma/client';
import { recordSync } from '@/shared/lib/sync-freshness';
import { fetchKmzbFeatures } from './client';
import { KMZB_FOREST_BUFFER_METERS } from './config';
import { type KmzbRow, toKmzbRow } from './mappers';

// Background sync: pull KMZB incidents, keep only those near a forest, and refresh the local
// table. Truncate+insert in a transaction so the table always mirrors KMZB's current set with no
// stale rows. Never hit on a user request - the user only ever reads kmzb_report.

export type KmzbSyncResult = { fetched: number; inserted: number; skipped: number };

const INSERT_BATCH = 500;
const TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 } as const;

// The service speaks EPSG:2180; PostGIS reprojects to 4326 on insert so we never reproject by hand.
function valuesRow(row: KmzbRow): Prisma.Sql {
  return Prisma.sql`(${row.id}, ${row.type}, ${row.status}, ${row.teryt}, ${row.eventAt}, ${row.createdAt}, ST_Transform(ST_SetSRID(ST_MakePoint(${row.x}, ${row.y}), 2180), 4326))`;
}

export async function syncKmzb(prisma: PrismaClient): Promise<KmzbSyncResult> {
  const features = await fetchKmzbFeatures();

  // Safety rule: a successful-but-empty fetch (e.g. the undocumented API silently changes its
  // filter grammar) must not wipe the table and report "no incidents". Over a 7-day national,
  // forest-filtered window zero features is implausible, so treat it as a failure and keep the
  // last good data + its (now visibly stale) freshness untouched.
  if (features.length === 0) {
    throw new Error('KMZB fetch returned no features - refusing to wipe the table');
  }

  const rows = features.map(toKmzbRow);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "kmzb_report"');

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const values = rows.slice(i, i + INSERT_BATCH).map(valuesRow);
      if (values.length === 0) {
        continue;
      }
      await tx.$executeRaw`
        INSERT INTO "kmzb_report" ("id", "type", "status", "teryt", "event_at", "created_at", "geom")
        VALUES ${Prisma.join(values)}
      `;
    }

    // Keep only incidents near a forest. The && against an expanded envelope uses the GIST index;
    // ST_DWithin in metres (geography) is authoritative on the few candidates.
    const degreePadding = KMZB_FOREST_BUFFER_METERS / 50_000;
    await tx.$executeRaw`
      DELETE FROM "kmzb_report" k
      WHERE NOT EXISTS (
        SELECT 1 FROM forest_area f
        WHERE f.geom && ST_Expand(k.geom, ${degreePadding})
          AND ST_DWithin(f.geom::geography, k.geom::geography, ${KMZB_FOREST_BUFFER_METERS})
      )
    `;
  }, TX_OPTIONS);

  const [{ inserted }] = await prisma.$queryRaw<[{ inserted: number }]>`SELECT COUNT(*)::int AS inserted FROM "kmzb_report"`;

  await recordSync(prisma, 'kmzb');

  return {
    fetched: features.length,
    inserted,
    skipped: features.length - inserted,
  };
}
