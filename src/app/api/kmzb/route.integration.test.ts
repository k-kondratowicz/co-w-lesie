import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET } from './route';

// Kraków area, inside the bbox below and within Poland so the spatial filter behaves realistically.
const HERE = { lng: 19.94, lat: 50.06 };
const BBOX = '19.0,49.0,21.0,51.0';

function insertKmzb(id: string, lng: number, lat: number) {
  return prisma.$executeRaw`
    INSERT INTO "kmzb_report" ("id", "type", "status", "teryt", "event_at", "created_at", "geom")
    VALUES (${id}, 'Kłusownictwo', 'Potwierdzone', NULL, NULL, NOW(), ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
  `;
}

function getKmzb(bbox = BBOX) {
  return GET(new NextRequest(`http://localhost/api/kmzb?bbox=${bbox}`));
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "kmzb_report"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/kmzb', () => {
  it('returns incidents inside the bbox and excludes those outside', async () => {
    await insertKmzb('in', HERE.lng, HERE.lat);
    await insertKmzb('out', 16.9, 52.5);

    const response = await getKmzb();
    const body = await response.json();
    const ids = body.features.map((feature: { properties: { id: string } }) => feature.properties.id);

    expect(response.status).toBe(200);
    expect(ids).toEqual(['in']);
  });

  it('exposes type/status/createdAt and a GeoJSON point geometry', async () => {
    await insertKmzb('in', HERE.lng, HERE.lat);

    const response = await getKmzb();
    const body = await response.json();
    const feature = body.features[0];

    expect(feature.geometry.type).toBe('Point');
    expect(feature.properties.type).toBe('Kłusownictwo');
    expect(feature.properties.status).toBe('Potwierdzone');
    expect(feature.properties.eventAt).toBeNull();
    expect(typeof feature.properties.createdAt).toBe('string');
  });

  it('reprojects EPSG:2180 easting/northing to 4326 on insert (mirrors syncKmzb ST_Transform)', async () => {
    // Krakow (19.94, 50.06) expressed in EPSG:2180 - the CRS the KMZB service speaks. The sync
    // inserts raw 2180 coords and lets PostGIS reproject; this guards the SRID + axis order.
    await prisma.$executeRaw`
      INSERT INTO "kmzb_report" ("id", "type", "status", "teryt", "event_at", "created_at", "geom")
      VALUES ('proj', 'Kłusownictwo', 'Potwierdzone', NULL, NULL, NOW(),
              ST_Transform(ST_SetSRID(ST_MakePoint(${567262.45}, ${244060.61}), 2180), 4326))
    `;

    const response = await getKmzb();
    const body = await response.json();
    const [lng, lat] = body.features[0].geometry.coordinates;

    expect(lng).toBeCloseTo(19.94, 3);
    expect(lat).toBeCloseTo(50.06, 3);
  });

  it('rejects an invalid bbox with 400', async () => {
    const response = await getKmzb('not-a-bbox');

    expect(response.status).toBe(400);
  });
});
