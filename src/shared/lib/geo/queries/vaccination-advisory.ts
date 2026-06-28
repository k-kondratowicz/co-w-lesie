import type { PrismaClient } from '@prisma/client';
import { VACCINATION_WINDOW_DAYS } from '@/shared/lib/lisy/config';

// Whether the point sits in a voivodeship with a fox-vaccine baiting campaign active today, where
// "active" spans VACCINATION_WINDOW_DAYS before the drop starts to the same after it ends. Feeds an
// informational advisory in the safety assistant, never the risk score - rabies baiting is a
// handling caution, not a reason to keep people out of the forest (mirrors the KMZB advisory).
// The page only gives voivodeship names, so this is a whole-voivodeship point-in-polygon test.

export type VaccinationAdvisory = {
  active: boolean;
  voivodeship: string | null;
  startDate: string | null;
  endDate: string | null;
};

const INACTIVE: VaccinationAdvisory = {
  active: false,
  voivodeship: null,
  startDate: null,
  endDate: null,
};

export async function queryVaccinationAdvisory(prisma: PrismaClient, lng: number, lat: number): Promise<VaccinationAdvisory> {
  const rows = await prisma.$queryRaw<{ voivodeship: string; start_date: Date; end_date: Date }[]>`
    SELECT v."name" AS voivodeship, c."start_date", c."end_date"
    FROM "voivodeship" v
    JOIN "vaccination_campaign" c ON c."voivodeship" = v."name"
    WHERE ST_Intersects(v."geom", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      AND CURRENT_DATE BETWEEN c."start_date" - (${VACCINATION_WINDOW_DAYS} || ' days')::interval
                           AND c."end_date" + (${VACCINATION_WINDOW_DAYS} || ' days')::interval
    ORDER BY c."start_date"
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return INACTIVE;
  }

  return {
    active: true,
    voivodeship: row.voivodeship,
    startDate: row.start_date.toISOString().slice(0, 10),
    endDate: row.end_date.toISOString().slice(0, 10),
  };
}
