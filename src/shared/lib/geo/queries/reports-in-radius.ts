import type { PrismaClient, ReportType } from '@prisma/client';

// Thin $queryRaw wrapper (I/O): reports within a radius, newest-relevant only. Uses the
// geog GIST index via ST_DWithin (metres). Distance is returned for callers that need it.

export type ReportInRadius = { id: string; type: ReportType; createdAt: Date; distanceMeters: number };

export async function queryReportsInRadius(
  prisma: PrismaClient,
  lng: number,
  lat: number,
  radiusMeters: number,
  windowDays: number,
): Promise<ReportInRadius[]> {
  return prisma.$queryRaw<ReportInRadius[]>`
    SELECT
      "id",
      "type",
      "createdAt",
      ST_Distance("geog", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS "distanceMeters"
    FROM "Report"
    WHERE ST_DWithin("geog", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
      AND "createdAt" > NOW() - (${windowDays} || ' days')::interval
    ORDER BY "distanceMeters" ASC
  `;
}
