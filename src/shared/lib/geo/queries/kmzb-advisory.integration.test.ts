import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { queryKmzbAdvisory } from './kmzb-advisory';

const HERE = { lng: 19.94, lat: 50.06 };

function insertKmzb(id: string, type: string, lng: number, lat: number) {
  return prisma.$executeRaw`
    INSERT INTO "kmzb_report" ("id", "type", "status", "teryt", "event_at", "created_at", "geom")
    VALUES (${id}, ${type}, 'Potwierdzone', NULL, NULL, NOW(), ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
  `;
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "kmzb_report"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('queryKmzbAdvisory', () => {
  it('counts danger-relevant types within the radius and ignores nuisance types', async () => {
    await insertKmzb('poach-1', 'Kłusownictwo', HERE.lng, HERE.lat);
    await insertKmzb('poach-2', 'Kłusownictwo', HERE.lng + 0.001, HERE.lat);
    await insertKmzb('burn-1', 'Wypalanie traw', HERE.lng, HERE.lat + 0.001);
    await insertKmzb('quad-1', 'Poruszanie się po terenach leśnych quadami', HERE.lng, HERE.lat);
    await insertKmzb('dump-1', 'Dzikie wysypiska śmieci', HERE.lng, HERE.lat);

    const advisory = await queryKmzbAdvisory(prisma, HERE.lng, HERE.lat, 5000);

    expect(advisory).toEqual({ poaching: 2, grassBurning: 1 });
  });

  it('excludes incidents outside the radius', async () => {
    await insertKmzb('poach-far', 'Kłusownictwo', 21.5, 51.5);

    const advisory = await queryKmzbAdvisory(prisma, HERE.lng, HERE.lat, 5000);

    expect(advisory).toEqual({ poaching: 0, grassBurning: 0 });
  });
});
