import { Prisma, type PrismaClient, type ReportType } from '@prisma/client';
import { disputeThresholdSql } from '@/features/reports/lifecycle';

const DISPUTE_CASE = Prisma.raw(disputeThresholdSql());

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
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
      AND ("flags" - "confirmations") < ${DISPUTE_CASE}
    ORDER BY "distanceMeters" ASC
  `;
}
