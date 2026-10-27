import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { fetchAllFeatures } from './client';
import type { EntryBanProps, FireHazardProps } from './schemas';
import { syncEntryBans, syncFireHazard } from './sync';

// Only the BDL network is mocked: a refused run is checked against real tables and BdlSync rows.
vi.mock('./client', () => ({ fetchAllFeatures: vi.fn(), fetchFeaturePages: vi.fn() }));

const KRAKOW_SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [19.9, 50.0],
      [20.0, 50.0],
      [20.0, 50.1],
      [19.9, 50.1],
      [19.9, 50.0],
    ],
  ],
};
const KRAKOW_WKT = 'MULTIPOLYGON(((19.9 50.0, 20.0 50.0, 20.0 50.1, 19.9 50.1, 19.9 50.0)))';
const LAST_GOOD_SYNC = new Date('2026-06-01T12:00:00Z');

function banFeature(objectid: number, dataKoncowa: string | null) {
  const properties: EntryBanProps = {
    objectid,
    kod: 'zagrożenie pożarowe',
    opis: null,
    data: '2026-06-01 00:00:00',
    data_koncowa: dataKoncowa,
    nazwa_nadl: 'Nadleśnictwo Testowe',
  };

  return { properties, geometry: KRAKOW_SQUARE };
}

function fireFeature(zone: string, code: string) {
  const properties: FireHazardProps = { strefa: zone, kod: code, data: '2026-06-10', godz: '13' };

  return { properties, geometry: KRAKOW_SQUARE };
}

function seedLastGoodBan() {
  return prisma.$executeRaw`
    INSERT INTO "forest_entry_ban" ("id", "reason", "until", "geom")
    VALUES ('last-good', 'zagrożenie pożarowe', NULL, ST_GeomFromText(${KRAKOW_WKT}, 4326))
  `;
}

function seedLastGoodFireZone() {
  return prisma.$executeRaw`
    INSERT INTO "fire_hazard_zone" ("id", "degree", "updated_at", "geom")
    VALUES ('last-good', 2, NOW(), ST_GeomFromText(${KRAKOW_WKT}, 4326))
  `;
}

async function ids(table: 'forest_entry_ban' | 'fire_hazard_zone'): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT "id" FROM "${table}" ORDER BY "id"`);

  return rows.map((row) => row.id);
}

async function syncedAt(dataset: 'fire' | 'bans'): Promise<Date | undefined> {
  const row = await prisma.bdlSync.findUnique({ where: { dataset }, select: { syncedAt: true } });

  return row?.syncedAt;
}

beforeEach(async () => {
  vi.mocked(fetchAllFeatures).mockReset();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "forest_entry_ban", "fire_hazard_zone"');
  await prisma.bdlSync.deleteMany({ where: { dataset: { in: ['fire', 'bans'] } } });
  await prisma.bdlSync.createMany({
    data: [
      { dataset: 'fire', syncedAt: LAST_GOOD_SYNC },
      { dataset: 'bans', syncedAt: LAST_GOOD_SYNC },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('syncEntryBans', () => {
  it('refuses to wipe the table when BDL returns no bans, keeping data and freshness', async () => {
    await seedLastGoodBan();
    vi.mocked(fetchAllFeatures).mockResolvedValue([]);

    await expect(syncEntryBans(prisma)).rejects.toThrow('refusing to wipe the table');

    expect(await ids('forest_entry_ban')).toEqual(['last-good']);
    expect(await syncedAt('bans')).toEqual(LAST_GOOD_SYNC);
  });

  // A date-format change can make every ban look expired; that must not read as "no bans anywhere".
  it('refuses when every fetched ban has already ended', async () => {
    await seedLastGoodBan();
    vi.mocked(fetchAllFeatures).mockResolvedValue([banFeature(1, '01-01-2020 00:00:00'), banFeature(2, '01-01-2021 00:00:00')]);

    await expect(syncEntryBans(prisma)).rejects.toThrow('no active bans (2 fetched)');

    expect(await ids('forest_entry_ban')).toEqual(['last-good']);
    expect(await syncedAt('bans')).toEqual(LAST_GOOD_SYNC);
  });

  it('replaces the table and records the sync when active bans arrive', async () => {
    await seedLastGoodBan();
    vi.mocked(fetchAllFeatures).mockResolvedValue([banFeature(7, null), banFeature(8, '01-01-2020 00:00:00')]);

    const result = await syncEntryBans(prisma);

    expect(result).toEqual({ fetched: 2, inserted: 1, skipped: 1 });
    expect(await ids('forest_entry_ban')).toEqual(['7']);
    expect((await syncedAt('bans'))?.getTime()).toBeGreaterThan(LAST_GOOD_SYNC.getTime());
  });
});

describe('syncFireHazard', () => {
  it('refuses to wipe the table when BDL returns no zones', async () => {
    await seedLastGoodFireZone();
    vi.mocked(fetchAllFeatures).mockResolvedValue([]);

    await expect(syncFireHazard(prisma)).rejects.toThrow('refusing to wipe the table');

    expect(await ids('fire_hazard_zone')).toEqual(['last-good']);
    expect(await syncedAt('fire')).toEqual(LAST_GOOD_SYNC);
  });

  it('refuses when no zone carries a recognised code (format drift)', async () => {
    await seedLastGoodFireZone();
    vi.mocked(fetchAllFeatures).mockResolvedValue([fireFeature('A', 'III'), fireFeature('B', '-2')]);

    await expect(syncFireHazard(prisma)).rejects.toThrow('none usable');

    expect(await ids('fire_hazard_zone')).toEqual(['last-good']);
    expect(await syncedAt('fire')).toEqual(LAST_GOOD_SYNC);
  });

  // Off-season every zone is -2/-1, so an empty table is the truth there (read as UNKNOWN).
  it('accepts an all-no-forecast response, emptying the table and recording the sync', async () => {
    await seedLastGoodFireZone();
    vi.mocked(fetchAllFeatures).mockResolvedValue([fireFeature('A', '-2'), fireFeature('B', '-1')]);

    const result = await syncFireHazard(prisma);

    expect(result).toEqual({ fetched: 2, inserted: 0, skipped: 2 });
    expect(await ids('fire_hazard_zone')).toEqual([]);
    expect((await syncedAt('fire'))?.getTime()).toBeGreaterThan(LAST_GOOD_SYNC.getTime());
  });

  it('stores the recognised zones and skips the no-forecast ones', async () => {
    vi.mocked(fetchAllFeatures).mockResolvedValue([fireFeature('A', '3'), fireFeature('B', '-2')]);

    const result = await syncFireHazard(prisma);

    expect(result).toEqual({ fetched: 2, inserted: 1, skipped: 1 });
    expect(await ids('fire_hazard_zone')).toEqual(['A']);
  });
});
