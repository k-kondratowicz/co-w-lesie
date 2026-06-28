import type { PrismaClient } from '@prisma/client';
import type { RiskResult } from '@/features/core/risk';
import { assessRisk, buildRiskMessage, RECENCY_WINDOW_DAYS } from '@/features/core/risk';
import { queryReportsInRadius } from '@/features/reports/queries/reports-in-radius';
import { DAY_MS } from '@/shared/lib/date/time';
import { queryKmzbAdvisory } from '@/shared/lib/geo/queries/kmzb-advisory';
import { queryNearbyBans } from '@/shared/lib/geo/queries/nearby-bans';
import { buildPointContext, queryPointContext } from '@/shared/lib/geo/queries/point-context';
import { queryVaccinationAdvisory } from '@/shared/lib/geo/queries/vaccination-advisory';

export type PointAssessment = RiskResult & {
  message: string;
  fireAsOf: string | null;
  bansAsOf: string | null;
  kmzbAsOf: string | null;
  vaccinationAsOf: string | null;
  ban: { reason: string | null; until: string | null } | null;
  nearbyBans: Awaited<ReturnType<typeof queryNearbyBans>>;
  kmzbAdvisory: Awaited<ReturnType<typeof queryKmzbAdvisory>>;
  vaccinationAdvisory: Awaited<ReturnType<typeof queryVaccinationAdvisory>>;
};

// Single orchestration of "how risky is this point" against our local PostGIS - shared by the
// user-facing /api/risk route and the saved-area notification cron so both read identical signals.
export async function assessPoint(prisma: PrismaClient, lat: number, lng: number, radius: number): Promise<PointAssessment> {
  const [nearbyReports, contextRow, nearbyBans, banSync, kmzbAdvisory, kmzbSync, vaccinationAdvisory, vaccinationSync] =
    await Promise.all([
      queryReportsInRadius(prisma, lng, lat, radius, RECENCY_WINDOW_DAYS),
      queryPointContext(prisma, lng, lat),
      queryNearbyBans(prisma, lng, lat, radius),
      prisma.bdlSync.findUnique({ where: { dataset: 'bans' } }),
      queryKmzbAdvisory(prisma, lng, lat, radius),
      prisma.bdlSync.findUnique({ where: { dataset: 'kmzb' } }),
      queryVaccinationAdvisory(prisma, lng, lat),
      prisma.bdlSync.findUnique({ where: { dataset: 'vaccination' } }),
    ]);

  const context = buildPointContext(contextRow, lng, lat);

  const now = Date.now();
  const result = assessRisk({
    reports: nearbyReports.map((report) => ({
      type: report.type,
      ageDays: (now - report.createdAt.getTime()) / DAY_MS,
    })),
    fireDegree: context.fire.status === 'OK' ? context.fire.degree : null,
    entryBan: context.entryBan.status === 'BAN',
    inForest: context.inForest.status,
    radiusMeters: radius,
  });

  const message = buildRiskMessage(result, {
    fireKnown: context.fire.status === 'OK',
    banKnown: context.entryBan.status !== 'UNKNOWN',
  });

  // Honest freshness, reported per signal: fire and bans refresh on different cadences, so we
  // surface each separately instead of collapsing to the oldest (which hid fresh fire data).
  const fireAsOf = contextRow.fire_updated_at ? contextRow.fire_updated_at.toISOString() : null;
  const bansAsOf = banSync?.syncedAt ? banSync.syncedAt.toISOString() : null;
  const kmzbAsOf = kmzbSync?.syncedAt ? kmzbSync.syncedAt.toISOString() : null;
  const vaccinationAsOf = vaccinationSync?.syncedAt ? vaccinationSync.syncedAt.toISOString() : null;

  const ban =
    context.entryBan.status === 'BAN' ? { reason: context.entryBan.reason ?? null, until: context.entryBan.until ?? null } : null;

  return {
    ...result,
    message,
    fireAsOf,
    bansAsOf,
    kmzbAsOf,
    vaccinationAsOf,
    ban,
    nearbyBans,
    kmzbAdvisory,
    vaccinationAdvisory,
  };
}
