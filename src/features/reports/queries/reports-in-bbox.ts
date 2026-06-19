import type { PrismaClient, ReportType } from '@prisma/client';
import { ageOpacity } from '@/features/reports/lifecycle';
import type { ReportsGeoJSON } from '@/features/reports/types';
import { reportImageUrl } from '@/shared/lib/r2';

type ReportRow = {
  id: string;
  type: ReportType;
  description: string | null;
  createdAt: Date;
  lastConfirmedAt: Date | null;
  expiresAt: Date | null;
  confirmations: number;
  flags: number;
  imageKey: string | null;
  lng: number;
  lat: number;
};

export async function queryReportsInBbox(
  prisma: PrismaClient,
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  since: Date | null,
): Promise<ReportsGeoJSON> {
  const rows = await prisma.$queryRaw<ReportRow[]>`
    SELECT "id", "type", "description", "createdAt", "lastConfirmedAt", "expiresAt", "confirmations", "flags", "imageKey", "lng", "lat"
    FROM "Report"
    WHERE ST_Intersects("geog", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography)
      AND ("expiresAt" IS NULL OR "expiresAt" > now())
      AND ("flags" - "confirmations") < CASE "type"
        WHEN 'FIRE' THEN 4
        WHEN 'SHOTS' THEN 4
        WHEN 'SHOTS_HEARD' THEN 4
        WHEN 'HUNTING' THEN 4
        WHEN 'AGGRESSIVE_ANIMAL' THEN 4
        ELSE 2
      END
      AND (${since}::timestamptz IS NULL OR "createdAt" > ${since}::timestamptz)
    ORDER BY "createdAt" DESC
    LIMIT 2000
  `;

  return {
    type: 'FeatureCollection',
    features: rows.map((report) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [report.lng, report.lat],
      },
      properties: {
        id: report.id,
        type: report.type,
        description: report.description,
        createdAt: report.createdAt.toISOString(),
        expiresAt: report.expiresAt ? report.expiresAt.toISOString() : null,
        confirmations: report.confirmations,
        flags: report.flags,
        imageUrl: reportImageUrl(report.imageKey),
        opacity: ageOpacity(report.type, report.lastConfirmedAt ?? report.createdAt),
      },
    })),
  };
}
