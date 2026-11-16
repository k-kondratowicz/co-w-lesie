import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET, POST } from './route';

// A point inside the bbox below (Kraków area, within Poland so geog/bbox behave realistically).
const HERE = { lat: 50.06, lng: 19.94 };
const BBOX = '19.0,49.0,21.0,51.0';

const r2 = vi.hoisted(() => ({
  configured: true,
  copyObject: vi.fn<(fromKey: string, toKey: string) => Promise<boolean>>(),
}));

vi.mock('@/shared/lib/r2', () => ({
  isR2Configured: () => r2.configured,
  copyObject: r2.copyObject,
}));

let ipCounter = 0;

function getReports(bbox = BBOX) {
  return GET(new NextRequest(`http://localhost/api/reports?bbox=${bbox}`));
}

function postReport(imageKey: string) {
  ipCounter += 1;

  return POST(
    new Request('http://localhost/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `8.8.8.${ipCounter}` },
      body: JSON.stringify({ type: 'FIRE', location: [HERE.lng, HERE.lat], imageKey }),
    }),
  );
}

async function storedImageKey(response: Response): Promise<string | null> {
  const { id } = await response.json();
  const report = await prisma.report.findUniqueOrThrow({
    where: { id },
    select: { imageKey: true },
  });

  return report.imageKey;
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
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future, flags: 5, confirmations: 0 }, // disputed (critical type needs 4+ net flags)
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

  it('uses a higher dispute threshold for critical hazard types', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const criticalFlagged = await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future, flags: 3, confirmations: 0 },
      select: { id: true },
    });
    await prisma.report.create({
      data: { type: 'ILLEGAL_DUMP', lat: HERE.lat, lng: HERE.lng, expiresAt: future, flags: 3, confirmations: 0 },
    });

    const body = await (await getReports()).json();
    const ids = body.features.map((f: { properties: { id: string } }) => f.properties.id);

    expect(ids).toContain(criticalFlagged.id);
    expect(ids).toHaveLength(1);
  });

  it('honours the `since` filter (hides reports created before it)', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const recent = await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future },
      select: { id: true },
    });
    const old = await prisma.report.create({
      // Active (not expired), but created 10 days ago.
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future, createdAt: new Date(Date.now() - 10 * 86_400_000) },
      select: { id: true },
    });

    const since = encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString());
    const filtered = await (await GET(new NextRequest(`http://localhost/api/reports?bbox=${BBOX}&since=${since}`))).json();
    const filteredIds = filtered.features.map((feature: { properties: { id: string } }) => feature.properties.id);

    expect(filteredIds).toContain(recent.id);
    expect(filteredIds).not.toContain(old.id);

    const all = await (await getReports()).json();
    const allIds = all.features.map((feature: { properties: { id: string } }) => feature.properties.id).sort();
    expect(allIds).toEqual([recent.id, old.id].sort());
  });

  it('honours the `types` filter (shows only selected types)', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const fire = await prisma.report.create({
      data: { type: 'FIRE', lat: HERE.lat, lng: HERE.lng, expiresAt: future },
      select: { id: true },
    });
    const dump = await prisma.report.create({
      data: { type: 'ILLEGAL_DUMP', lat: HERE.lat, lng: HERE.lng, expiresAt: future },
      select: { id: true },
    });
    await prisma.report.create({ data: { type: 'BLOOD', lat: HERE.lat, lng: HERE.lng, expiresAt: future } });

    const filtered = await (
      await GET(new NextRequest(`http://localhost/api/reports?bbox=${BBOX}&types=FIRE,ILLEGAL_DUMP`))
    ).json();
    const ids = filtered.features.map((feature: { properties: { id: string } }) => feature.properties.id).sort();

    expect(ids).toEqual([fire.id, dump.id].sort());
  });

  it('rejects an unknown report type', async () => {
    const response = await GET(new NextRequest(`http://localhost/api/reports?bbox=${BBOX}&types=NOT_A_TYPE`));

    expect(response.status).toBe(400);
  });
});

describe('POST /api/reports with a photo', () => {
  let forestId: bigint;

  beforeAll(async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');

    const [forest] = await prisma.$queryRaw<{ id: bigint }[]>`
      INSERT INTO forest_area (geom)
      VALUES (ST_Multi(ST_MakeEnvelope(${HERE.lng - 0.01}, ${HERE.lat - 0.01}, ${HERE.lng + 0.01}, ${HERE.lat + 0.01}, 4326)))
      RETURNING id
    `;
    forestId = forest.id;
  });

  beforeEach(() => {
    r2.configured = true;
    r2.copyObject.mockReset();
    r2.copyObject.mockResolvedValue(true);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();

    await prisma.$executeRaw`DELETE FROM forest_area WHERE id = ${forestId}`;
  });

  it('copies the staged photo into reports/ and stores that key', async () => {
    const response = await postReport('pending/0f2c-91ab.webp');

    expect(response.status).toBe(201);
    expect(r2.copyObject).toHaveBeenCalledWith('pending/0f2c-91ab.webp', 'reports/0f2c-91ab.webp');
    expect(await storedImageKey(response)).toBe('reports/0f2c-91ab.webp');
  });

  it('saves the report without the photo when the staged object is gone', async () => {
    r2.copyObject.mockResolvedValue(false);

    const response = await postReport('pending/0f2c-91ab.webp');

    expect(response.status).toBe(201);
    expect(await storedImageKey(response)).toBeNull();
  });

  it('keeps a reports/ key from an older offline queue without copying', async () => {
    const response = await postReport('reports/0f2c-91ab.webp');

    expect(response.status).toBe(201);
    expect(r2.copyObject).not.toHaveBeenCalled();
    expect(await storedImageKey(response)).toBe('reports/0f2c-91ab.webp');
  });

  it('saves the report without the photo when R2 is not configured', async () => {
    r2.configured = false;

    const response = await postReport('pending/0f2c-91ab.webp');

    expect(response.status).toBe(201);
    expect(r2.copyObject).not.toHaveBeenCalled();
    expect(await storedImageKey(response)).toBeNull();
  });

  // A 5xx makes the offline queue retry later, which is right for a transient R2 outage.
  it('returns 500 when R2 fails for another reason', async () => {
    r2.copyObject.mockRejectedValue(new Error('R2 copy failed (503)'));

    const response = await postReport('pending/0f2c-91ab.webp');

    expect(response.status).toBe(500);
    expect(await prisma.report.count()).toBe(0);
  });
});
