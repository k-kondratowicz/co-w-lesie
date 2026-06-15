import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET } from './route';

// A point inside the bbox below (Kraków area, within Poland so geog/bbox behave realistically).
const HERE = { lat: 50.06, lng: 19.94 };
const BBOX = '19.0,49.0,21.0,51.0';

function getReports(bbox = BBOX) {
  return GET(new NextRequest(`http://localhost/api/reports?bbox=${bbox}`));
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ReportVote", "Report" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/reports', () => {
  it('returns active reports and hides expired, disputed and out-of-bbox ones', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 60 * 1000);

    const active = await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future },
      select: { id: true },
    });
    const legacy = await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: null }, // legacy row, no expiry
      select: { id: true },
    });
    await prisma.report.create({ data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: past } });
    await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future, flags: 3, confirmations: 0 }, // disputed
    });
    await prisma.report.create({ data: { type: 'FIRE', lat: 52.5, lng: 16.9, expiresAt: future } }); // outside bbox

    const response = await getReports();
    const body = await response.json();
    const ids = body.features.map((feature: { properties: { id: string } }) => feature.properties.id).sort();

    expect(response.status).toBe(200);
    expect(ids).toEqual([active.id, legacy.id].sort());
  });

  it('exposes lifecycle properties on each feature', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const report = await prisma.report.create({
      data: { type: 'BLOOD', lat: HERE.lat, lng: HERE.lng, expiresAt: future, confirmations: 2, flags: 1 },
      select: { id: true },
    });

    const body = await (await getReports()).json();
    const feature = body.features.find((f: { properties: { id: string } }) => f.properties.id === report.id);

    expect(feature.properties).toMatchObject({ type: 'BLOOD', confirmations: 2, flags: 1 });
    expect(feature.properties.expiresAt).toBe(future.toISOString());
    expect(typeof feature.properties.opacity).toBe('number');
  });
});
