import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { HOUR_MS } from '@/shared/lib/date/time';
import { prisma } from '@/shared/lib/prisma';
import { assessPoint } from './assess-point';

// Kraków, inside Poland so fire and bans count as covered, and inside the square below.
const HERE = { lng: 19.95, lat: 50.05 };
const SQUARE_WKT = 'MULTIPOLYGON(((19.9 50.0, 20.0 50.0, 20.0 50.1, 19.9 50.1, 19.9 50.0)))';
const RADIUS_METERS = 5000;

const NO_KNOWN_HAZARDS = /^Brak znanych zagrożeń/;
const COULD_NOT_CONFIRM = /^Nie udało się potwierdzić wszystkich warunków/;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

function insertFireZone(degree: number, issuedAt: Date = new Date()) {
  return prisma.$executeRaw`
    INSERT INTO "fire_hazard_zone" ("id", "degree", "updated_at", "geom")
    VALUES ('zone', ${degree}, ${issuedAt}, ST_GeomFromText(${SQUARE_WKT}, 4326))
  `;
}

function insertBan() {
  return prisma.$executeRaw`
    INSERT INTO "forest_entry_ban" ("id", "reason", "until", "geom")
    VALUES ('ban', 'zagrożenie pożarowe', NULL, ST_GeomFromText(${SQUARE_WKT}, 4326))
  `;
}

async function setSyncedAt(fire: Date, bans: Date) {
  await prisma.bdlSync.deleteMany({ where: { dataset: { in: ['fire', 'bans'] } } });
  await prisma.bdlSync.createMany({
    data: [
      { dataset: 'fire', syncedAt: fire },
      { dataset: 'bans', syncedAt: bans },
    ],
  });
}

function assessHere() {
  return assessPoint(prisma, HERE.lat, HERE.lng, RADIUS_METERS);
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Report", "fire_hazard_zone", "forest_entry_ban" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('assessPoint - sync freshness', () => {
  it('reports no known hazards when fire and bans are freshly synced', async () => {
    await insertFireZone(0);
    await setSyncedAt(hoursAgo(1), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('GREEN');
    expect(assessment.message).toMatch(NO_KNOWN_HAZARDS);
    expect(assessment.signals.fire.state).toBe('CURRENT');
    expect(assessment.signals.entryBan.state).toBe('CURRENT');
  });

  it('keeps GREEN but cautious when BDL publishes no forecast for the point', async () => {
    await setSyncedAt(hoursAgo(1), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('GREEN');
    expect(assessment.signals.fire.state).toBe('NO_DATA');
    expect(assessment.message).toMatch(COULD_NOT_CONFIRM);
  });

  // BDL issues no forecast overnight, so a sync from 16:00 UTC is still current the next morning.
  it('still trusts fire data across the overnight sync gap', async () => {
    await insertFireZone(0);
    await setSyncedAt(hoursAgo(14), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.message).toMatch(NO_KNOWN_HAZARDS);
  });

  it('stops confirming "no hazards" once the fire sync is stale', async () => {
    await insertFireZone(0);
    await setSyncedAt(hoursAgo(20), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('UNKNOWN');
    expect(assessment.signals.fire.state).toBe('STALE');
    expect(assessment.message).toMatch(COULD_NOT_CONFIRM);
    expect(assessment.fireAsOf).not.toBeNull();
  });

  // BDL stops issuing off-season, so a sync can succeed today while carrying a days-old forecast.
  it('treats an old forecast as stale even when the sync is fresh', async () => {
    await insertFireZone(0, hoursAgo(48));
    await setSyncedAt(hoursAgo(1), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('UNKNOWN');
    expect(assessment.signals.fire.state).toBe('STALE');
    expect(assessment.message).toMatch(COULD_NOT_CONFIRM);
  });

  it('keeps the previous afternoon forecast current through the morning', async () => {
    await insertFireZone(0, hoursAgo(20));
    await setSyncedAt(hoursAgo(1), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.signals.fire.state).toBe('CURRENT');
    expect(assessment.message).toMatch(NO_KNOWN_HAZARDS);
  });

  it('stops confirming "no hazards" once the ban sync is stale, and reports its real age', async () => {
    const staleBanSync = hoursAgo(72);
    await insertFireZone(0);
    await setSyncedAt(hoursAgo(1), staleBanSync);

    const assessment = await assessHere();

    expect(assessment.level).toBe('UNKNOWN');
    expect(assessment.signals.entryBan).toEqual({ active: false, state: 'STALE' });
    expect(assessment.message).toMatch(COULD_NOT_CONFIRM);
    expect(assessment.bansAsOf).toBe(staleBanSync.toISOString());
  });

  it('treats a never-synced dataset as unconfirmed', async () => {
    await insertFireZone(0);
    await prisma.bdlSync.deleteMany({ where: { dataset: { in: ['fire', 'bans'] } } });

    const assessment = await assessHere();

    expect(assessment.level).toBe('UNKNOWN');
    expect(assessment.message).toMatch(COULD_NOT_CONFIRM);
    expect(assessment.bansAsOf).toBeNull();
  });

  // Staleness may only make the answer more cautious - a hazard the last good data shows stays RED.
  it('keeps a stale entry ban RED', async () => {
    await insertFireZone(0);
    await insertBan();
    await setSyncedAt(hoursAgo(1), hoursAgo(72));

    const assessment = await assessHere();

    expect(assessment.level).toBe('RED');
    expect(assessment.message).toMatch(/^Obowiązuje zakaz wstępu/);
  });

  it('keeps a stale fire degree III RED', async () => {
    await insertFireZone(3);
    await setSyncedAt(hoursAgo(20), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('RED');
    expect(assessment.message).toMatch(/^Ekstremalne zagrożenie pożarowe/);
  });

  it('keeps an old degree III forecast RED', async () => {
    await insertFireZone(3, hoursAgo(48));
    await setSyncedAt(hoursAgo(1), hoursAgo(1));

    const assessment = await assessHere();

    expect(assessment.level).toBe('RED');
    expect(assessment.signals.fire.state).toBe('STALE');
  });
});
