import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { recordSync } from '@/shared/lib/sync-freshness';
import { fetchAllFeatures, fetchFeaturePages } from './client';
import { ENTRY_BAN_LAYER, FIRE_HAZARD_LAYER, FOREST_LAYERS } from './config';
import { banReason, fireKodToDegree, fireUpdatedAt, parseBdlDateTime } from './mappers';
import { entryBanProps, fireHazardProps, forestCompartmentProps } from './schemas';

// Background sync: pull from BDL, validate, and refresh our local PostGIS tables.
// Strategy is truncate+insert in a transaction - both layers are small, so the table
// always mirrors BDL's currently-published set with no stale rows left behind.

export type SyncResult = { fetched: number; inserted: number; skipped: number };

const TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 } as const;

// Coerce a GeoJSON geometry (possibly Polygon) into geometry(MultiPolygon, 4326).
function geomFromGeoJson(geometry: unknown): Prisma.Sql {
  const json = JSON.stringify(geometry);
  return Prisma.sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${json}), 4326))`;
}

export async function syncFireHazard(prisma: PrismaClient): Promise<SyncResult> {
  const features = await fetchAllFeatures(FIRE_HAZARD_LAYER, fireHazardProps, {
    outFields: ['strefa', 'kod', 'data', 'godz'],
    orderByField: 'objectid',
    maxAllowableOffset: 0.0005,
  });

  let inserted = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "fire_hazard_zone"');

    for (const { properties, geometry } of features) {
      const degree = fireKodToDegree(properties.kod);
      const updatedAt = fireUpdatedAt(properties.data, properties.godz);
      // Skip areas not covered by the forecast (degree null) so they read as UNKNOWN.
      if (degree === null || !updatedAt) {
        skipped++;
        continue;
      }

      await tx.$executeRaw`
        INSERT INTO "fire_hazard_zone" ("id", "degree", "updated_at", "geom")
        VALUES (${properties.strefa}, ${degree}, ${updatedAt}, ${geomFromGeoJson(geometry)})
        ON CONFLICT ("id") DO UPDATE
          SET "degree" = EXCLUDED."degree",
              "updated_at" = EXCLUDED."updated_at",
              "geom" = EXCLUDED."geom"
      `;
      inserted++;
    }
  }, TX_OPTIONS);

  await recordSync(prisma, 'fire');
  return { fetched: features.length, inserted, skipped };
}

export async function syncEntryBans(prisma: PrismaClient): Promise<SyncResult> {
  const features = await fetchAllFeatures(ENTRY_BAN_LAYER, entryBanProps, {
    outFields: ['objectid', 'kod', 'opis', 'data', 'data_koncowa', 'nazwa_nadl'],
    orderByField: 'objectid',
    maxAllowableOffset: 0.0005,
  });

  const now = Date.now();
  let inserted = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "forest_entry_ban"');

    for (const { properties, geometry } of features) {
      const until = parseBdlDateTime(properties.data_koncowa);
      // Drop bans that have already ended; presence of a row means an active ban.
      if (until && until.getTime() < now) {
        skipped++;
        continue;
      }

      await tx.$executeRaw`
        INSERT INTO "forest_entry_ban" ("id", "reason", "until", "geom")
        VALUES (
          ${String(properties.objectid)},
          ${banReason(properties.kod, properties.opis)},
          ${until},
          ${geomFromGeoJson(geometry)}
        )
        ON CONFLICT ("id") DO UPDATE
          SET "reason" = EXCLUDED."reason",
              "until" = EXCLUDED."until",
              "geom" = EXCLUDED."geom"
      `;
      inserted++;
    }
  }, TX_OPTIONS);

  await recordSync(prisma, 'bans');
  return { fetched: features.length, inserted, skipped };
}

export type Bbox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

const FOREST_INSERT_BATCH = 500;

/**
 * Seeds forest_area from the BDL compartment layers (PGL LP + outside PGL LP), bounded by
 * a bbox. We only need geometry for in-forest detection, so attributes are discarded.
 * Compartments are small/simple, so we simplify to ~11 m.
 *
 * Streams page-by-page so memory stays bounded even country-wide (~455k polygons). The table
 * is truncated first and rows are inserted with autocommit (no long-running transaction), so a
 * failed run leaves partial data and is safe to re-run.
 */
export async function syncForestArea(
  prisma: PrismaClient,
  bbox: Bbox,
  onProgress?: (inserted: number) => void,
): Promise<SyncResult> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "forest_area" RESTART IDENTITY');

  let fetched = 0;
  let inserted = 0;

  for (const layer of FOREST_LAYERS) {
    for await (const page of fetchFeaturePages(layer, forestCompartmentProps, {
      outFields: ['compartment_id'],
      orderByField: 'compartment_id',
      maxAllowableOffset: 0.0001,
      bbox,
    })) {
      fetched += page.length;

      for (let i = 0; i < page.length; i += FOREST_INSERT_BATCH) {
        const rows = page.slice(i, i + FOREST_INSERT_BATCH).map(({ geometry }) => Prisma.sql`(${geomFromGeoJson(geometry)})`);
        if (rows.length === 0) {
          continue;
        }
        await prisma.$executeRaw`INSERT INTO "forest_area" ("geom") VALUES ${Prisma.join(rows)}`;
        inserted += rows.length;
      }
      onProgress?.(inserted);
    }
  }

  await recordSync(prisma, 'forest');
  return { fetched, inserted, skipped: fetched - inserted };
}
