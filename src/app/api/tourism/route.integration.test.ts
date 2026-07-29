import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET } from './route';

// Krakow area, inside the bbox below.
const HERE = { lng: 19.94, lat: 50.06 };
const BBOX = '19.0,49.0,21.0,51.0';

function insertPoi(id: string, kind: string, lng: number, lat: number, name: string | null = null) {
  return prisma.$executeRaw`
    INSERT INTO "tourism_poi" ("id", "kind", "name", "geom")
    VALUES (${id}, ${kind}, ${name}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
  `;
}

function getTourism(kinds = 'PARKING,VEHICLE_STOP', bbox = BBOX) {
  return GET(new NextRequest(`http://localhost/api/tourism?bbox=${bbox}&kinds=${kinds}`));
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tourism_poi"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/tourism', () => {
  it('returns only the requested kinds inside the bbox', async () => {
    await insertPoi('parking-in', 'PARKING', HERE.lng, HERE.lat);
    await insertPoi('stop-in', 'VEHICLE_STOP', HERE.lng + 0.01, HERE.lat);
    await insertPoi('camp-in', 'CAMP_SITE', HERE.lng, HERE.lat + 0.01);
    await insertPoi('parking-out', 'PARKING', 16.9, 52.5);

    const response = await getTourism();
    const body = await response.json();
    const ids = body.features.map((feature: { properties: { id: string } }) => feature.properties.id).sort();

    expect(response.status).toBe(200);
    expect(ids).toEqual(['parking-in', 'stop-in']);
  });

  it('exposes kind, name and a GeoJSON point geometry', async () => {
    await insertPoi('parking-in', 'PARKING', HERE.lng, HERE.lat, 'Parking Lasek');

    const response = await getTourism();
    const feature = (await response.json()).features[0];

    expect(feature.geometry.type).toBe('Point');
    expect(feature.properties.kind).toBe('PARKING');
    expect(feature.properties.name).toBe('Parking Lasek');
  });

  it('rejects an unknown kind with 400 rather than returning everything', async () => {
    const response = await getTourism('PARKING,SOMETHING_ELSE');

    expect(response.status).toBe(400);
  });

  it('rejects a missing kinds param with 400', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/tourism?bbox=${BBOX}`));

    expect(response.status).toBe(400);
  });

  it('rejects an invalid bbox with 400', async () => {
    const response = await getTourism('PARKING', 'not-a-bbox');

    expect(response.status).toBe(400);
  });
});
