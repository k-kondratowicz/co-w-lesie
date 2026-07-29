import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET } from './route';

const BBOX = '19.0,49.0,21.0,51.0';

// A small square around the given corner, stored as MultiPolygon like the sync does.
function insertZone(id: string, lng: number, lat: number, name: string | null = null) {
  const wkt = `MULTIPOLYGON(((${lng} ${lat}, ${lng + 0.01} ${lat}, ${lng + 0.01} ${lat + 0.01}, ${lng} ${lat + 0.01}, ${lng} ${lat})))`;

  return prisma.$executeRaw`
    INSERT INTO "overnight_zone" ("id", "name", "geom")
    VALUES (${id}, ${name}, ST_SetSRID(ST_GeomFromText(${wkt}), 4326))
  `;
}

function getZones(bbox = BBOX) {
  return GET(new NextRequest(`http://localhost/api/overnight-zones?bbox=${bbox}`));
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "overnight_zone"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/overnight-zones', () => {
  it('returns zones intersecting the bbox and excludes those outside', async () => {
    await insertZone('in', 19.94, 50.06, 'Nadleśnictwo Testowe');
    await insertZone('out', 16.9, 52.5);

    const response = await getZones();
    const body = await response.json();
    const ids = body.features.map((feature: { properties: { id: string } }) => feature.properties.id);

    expect(response.status).toBe(200);
    expect(ids).toEqual(['in']);
    expect(body.features[0].geometry.type).toBe('MultiPolygon');
    expect(body.features[0].properties.name).toBe('Nadleśnictwo Testowe');
  });

  it('rejects an invalid bbox with 400', async () => {
    const response = await getZones('not-a-bbox');

    expect(response.status).toBe(400);
  });
});
