import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { queryReportsInRadius } from '@/features/reports/queries/reports-in-radius';
import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, RECENCY_WINDOW_DAYS } from '@/features/risk/config';
import { assessRisk } from '@/features/risk/engine';
import { buildRiskMessage } from '@/features/risk/message';
import { queryNearbyBans } from '@/shared/lib/geo/queries/nearby-bans';
import { buildPointContext, queryPointContext } from '@/shared/lib/geo/queries/point-context';
import { prisma } from '@/shared/lib/prisma';
import { DAY_MS } from '@/shared/lib/time';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/risk?lat=&lng=&radius= - safety assessment for a point.
const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(MAX_RADIUS_METERS).default(DEFAULT_RADIUS_METERS),
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    lat: params.get('lat'),
    lng: params.get('lng'),
    radius: params.get('radius') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe parametry zapytania', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const { lat, lng, radius } = parsed.data;

  try {
    const [nearbyReports, contextRow, nearbyBans, banSync] = await Promise.all([
      queryReportsInRadius(prisma, lng, lat, radius, RECENCY_WINDOW_DAYS),
      queryPointContext(prisma, lng, lat),
      queryNearbyBans(prisma, lng, lat, radius),
      prisma.bdlSync.findUnique({ where: { dataset: 'bans' } }),
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

    // Why the area is closed (shown in the assistant), when there's an active ban.
    const ban =
      context.entryBan.status === 'BAN'
        ? { reason: context.entryBan.reason ?? null, until: context.entryBan.until ?? null }
        : null;

    return Response.json({ ...result, message, fireAsOf, bansAsOf, ban, nearbyBans });
  } catch (error) {
    console.error('[GET /api/risk] assessment failed', error);
    return Response.json({ error: 'Nie udało się ocenić ryzyka' }, { status: 500 });
  }
}
