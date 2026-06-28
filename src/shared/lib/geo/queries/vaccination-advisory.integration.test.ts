import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { queryVaccinationAdvisory } from './vaccination-advisory';

// Self-contained synthetic voivodeships (the real GUS shapefile is not committed): two boxes, one
// covering KRAKOW and one well away from it. Avoids depending on a seed the CI box can't run.
const KRAKOW = { lng: 19.94, lat: 50.06 };
const BALTIC = { lng: 18.5, lat: 56.0 }; // outside both boxes

const MALOPOLSKIE_BOX = 'MULTIPOLYGON(((19.8 49.9, 20.1 49.9, 20.1 50.2, 19.8 50.2, 19.8 49.9)))';
const PODLASKIE_BOX = 'MULTIPOLYGON(((22.8 52.8, 23.2 52.8, 23.2 53.2, 22.8 53.2, 22.8 52.8)))';

function upsertVoivodeship(teryt: string, name: string, wkt: string) {
  return prisma.$executeRaw`
    INSERT INTO "voivodeship" ("teryt", "name", "geom")
    VALUES (${teryt}, ${name}, ST_GeomFromText(${wkt}, 4326))
    ON CONFLICT ("teryt") DO UPDATE SET "name" = EXCLUDED."name", "geom" = EXCLUDED."geom"
  `;
}

// Campaign dates are written relative to CURRENT_DATE so the +/-14d window boundaries can be tested
// deterministically regardless of when the suite runs.
function insertCampaign(id: string, voivodeship: string, startOffsetDays: number, endOffsetDays: number) {
  return prisma.$executeRaw`
    INSERT INTO "vaccination_campaign" ("id", "year", "start_date", "end_date", "voivodeship", "source", "fetched_at")
    VALUES (
      ${id},
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      CURRENT_DATE + ${startOffsetDays} * INTERVAL '1 day',
      CURRENT_DATE + ${endOffsetDays} * INTERVAL '1 day',
      ${voivodeship}, 'test', NOW()
    )
  `;
}

beforeAll(async () => {
  await upsertVoivodeship('12', 'małopolskie', MALOPOLSKIE_BOX);
  await upsertVoivodeship('20', 'podlaskie', PODLASKIE_BOX);
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "vaccination_campaign"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('queryVaccinationAdvisory', () => {
  it('reports active when the drop is in progress in the voivodeship containing the point', async () => {
    await insertCampaign('now', 'małopolskie', -2, 2);

    const advisory = await queryVaccinationAdvisory(prisma, KRAKOW.lng, KRAKOW.lat);

    expect(advisory.active).toBe(true);
    expect(advisory.voivodeship).toBe('małopolskie');
    expect(advisory.startDate).not.toBeNull();
    expect(advisory.endDate).not.toBeNull();
  });

  it('stays active within the 14-day pre-window and post-window', async () => {
    await insertCampaign('soon', 'małopolskie', 14, 18); // starts in 14 days
    expect((await queryVaccinationAdvisory(prisma, KRAKOW.lng, KRAKOW.lat)).active).toBe(true);

    await prisma.$executeRawUnsafe('TRUNCATE TABLE "vaccination_campaign"');

    await insertCampaign('recent', 'małopolskie', -20, -14); // ended 14 days ago
    expect((await queryVaccinationAdvisory(prisma, KRAKOW.lng, KRAKOW.lat)).active).toBe(true);
  });

  it('is inactive once outside the 14-day window', async () => {
    await insertCampaign('long-over', 'małopolskie', -40, -15); // ended 15 days ago

    const advisory = await queryVaccinationAdvisory(prisma, KRAKOW.lng, KRAKOW.lat);

    expect(advisory.active).toBe(false);
    expect(advisory.voivodeship).toBeNull();
  });

  it('ignores a campaign in a different voivodeship', async () => {
    await insertCampaign('elsewhere', 'podlaskie', -2, 2);

    expect((await queryVaccinationAdvisory(prisma, KRAKOW.lng, KRAKOW.lat)).active).toBe(false);
  });

  it('is inactive for a point outside every voivodeship', async () => {
    await insertCampaign('now', 'małopolskie', -2, 2);

    expect((await queryVaccinationAdvisory(prisma, BALTIC.lng, BALTIC.lat)).active).toBe(false);
  });
});
