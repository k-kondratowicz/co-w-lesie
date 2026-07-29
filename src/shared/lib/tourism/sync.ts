import { Prisma, type PrismaClient } from '@prisma/client';
import { fetchAllFeatures } from '@/shared/lib/bdl/client';
import { recordSync } from '@/shared/lib/sync-freshness';
import {
  CAMPING_DESCRIPTIONS,
  descriptionFilter,
  OVERNIGHT_BASE_LAYER,
  OVERNIGHT_ZONE_LAYER,
  PARKING_DESCRIPTIONS,
  RECREATION_AREA_LAYER,
} from './config';
import { descriptionToKind, tourismObjectName } from './mappers';
import { overnightZoneProps, tourismPoiProps } from './schemas';

// Background sync: pull the BDL tourism layers, validate, and refresh our local PostGIS tables.
// Truncate+insert in a transaction so a table always mirrors what BDL currently publishes. Never
// hit on a user request - the user only ever reads tourism_poi / overnight_zone.

export type TourismSyncResult = { fetched: number; inserted: number; skipped: number };

const TX_OPTIONS = { timeout: 120_000, maxWait: 10_000 } as const;
const INSERT_BATCH = 500;

const POI_LAYERS = [
  { url: RECREATION_AREA_LAYER, descriptions: PARKING_DESCRIPTIONS },
  { url: OVERNIGHT_BASE_LAYER, descriptions: CAMPING_DESCRIPTIONS },
];

type PoiRow = { id: string; kind: string; name: string | null; lng: number; lat: number };

export async function syncTourismPois(prisma: PrismaClient): Promise<TourismSyncResult> {
  let fetched = 0;
  const rows: PoiRow[] = [];

  for (const layer of POI_LAYERS) {
    const features = await fetchAllFeatures(layer.url, tourismPoiProps, {
      outFields: ['obj_id', 'nzw_ob', 'tur_obj_desc'],
      orderByField: 'obj_id',
      where: descriptionFilter(layer.descriptions),
    });
    fetched += features.length;

    for (const { properties, geometry } of features) {
      const kind = descriptionToKind(properties.tur_obj_desc);
      const [lng, lat] = (geometry.coordinates ?? []) as number[];
      if (!kind || typeof lng !== 'number' || typeof lat !== 'number') {
        continue;
      }

      rows.push({
        id: `${kind}-${properties.obj_id}`,
        kind,
        name: tourismObjectName(properties.nzw_ob),
        lng,
        lat,
      });
    }
  }

  // A successful-but-empty fetch (BDL reworking the layer or its filter grammar) must not wipe the
  // table and leave the map silently showing "no parking anywhere" - keep the last good set.
  if (rows.length === 0) {
    throw new Error('BDL tourism POI fetch returned no usable features - refusing to wipe the table');
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "tourism_poi"');

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const values = rows
        .slice(i, i + INSERT_BATCH)
        .map((row) => Prisma.sql`(${row.id}, ${row.kind}, ${row.name}, ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326))`);

      await tx.$executeRaw`
        INSERT INTO "tourism_poi" ("id", "kind", "name", "geom")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("id") DO UPDATE
          SET "kind" = EXCLUDED."kind",
              "name" = EXCLUDED."name",
              "geom" = EXCLUDED."geom"
      `;
    }
  }, TX_OPTIONS);

  await recordSync(prisma, 'tourism');

  return {
    fetched,
    inserted: rows.length,
    skipped: fetched - rows.length,
  };
}

export async function syncOvernightZones(prisma: PrismaClient): Promise<TourismSyncResult> {
  const features = await fetchAllFeatures(OVERNIGHT_ZONE_LAYER, overnightZoneProps, {
    outFields: ['obj_id', 'nzw_ob'],
    orderByField: 'obj_id',
    // Programme areas are whole forest ranges drawn in fine detail; ~55 m is far below what the
    // map shows and keeps the layer light enough to page.
    maxAllowableOffset: 0.0005,
  });

  const rows = features.map(
    ({ properties, geometry }) =>
      Prisma.sql`(${String(properties.obj_id)}, ${tourismObjectName(properties.nzw_ob)}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)))`,
  );

  if (rows.length === 0) {
    throw new Error('BDL "Zanocuj w lesie" fetch returned no features - refusing to wipe the table');
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "overnight_zone"');

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      await tx.$executeRaw`
        INSERT INTO "overnight_zone" ("id", "name", "geom")
        VALUES ${Prisma.join(rows.slice(i, i + INSERT_BATCH))}
        ON CONFLICT ("id") DO UPDATE
          SET "name" = EXCLUDED."name",
              "geom" = EXCLUDED."geom"
      `;
    }
  }, TX_OPTIONS);

  await recordSync(prisma, 'tourism');

  return {
    fetched: features.length,
    inserted: rows.length,
    skipped: features.length - rows.length,
  };
}
