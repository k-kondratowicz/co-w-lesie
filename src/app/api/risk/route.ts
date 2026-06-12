import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS, RECENCY_WINDOW_DAYS } from '@/features/risk/config';
import { assessRisk } from '@/features/risk/engine';
import { buildRiskMessage } from '@/features/risk/message';
import { buildPointContext, queryPointContext } from '@/shared/lib/geo/queries/point-context';
import { queryReportsInRadius } from '@/shared/lib/geo/queries/reports-in-radius';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/risk?lat=&lng=&radius= — safety assessment for a point.
const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(MAX_RADIUS_METERS).default(DEFAULT_RADIUS_METERS),
});

const MS_PER_DAY = 86_400_000;

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
    const [nearbyReports, contextRow, banSync] = await Promise.all([
      queryReportsInRadius(prisma, lng, lat, radius, RECENCY_WINDOW_DAYS),
      queryPointContext(prisma, lng, lat),
      prisma.bdlSync.findUnique({ where: { dataset: 'bans' } }),
    ]);
    const context = buildPointContext(contextRow, lng, lat);

    const now = Date.now();
    const result = assessRisk({
      reports: nearbyReports.map((report) => ({
        type: report.type,
        ageDays: (now - report.createdAt.getTime()) / MS_PER_DAY,
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

    // Honest freshness: oldest of the time-sensitive signals — the fire forecast time of the
    // intersecting zone and the entry-ban sync time. (Reports are individually timed; the
    // forest layer is effectively static.) Null when neither is known.
    const freshnessTimes = [contextRow.fire_updated_at, banSync?.syncedAt ?? null].filter((date): date is Date => date != null);
    const dataAsOf = freshnessTimes.length
      ? new Date(Math.min(...freshnessTimes.map((date) => date.getTime()))).toISOString()
      : null;

    return Response.json({ ...result, message, dataAsOf });
  } catch (error) {
    console.error('[GET /api/risk] assessment failed', error);
    return Response.json({ error: 'Nie udało się ocenić ryzyka' }, { status: 500 });
  }
}
