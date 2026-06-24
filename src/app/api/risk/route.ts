import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS } from '@/features/core/risk';
import { prisma } from '@/shared/lib/prisma';
import { assessPoint } from '@/shared/lib/risk/assess-point';

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
    return Response.json(await assessPoint(prisma, lat, lng, radius));
  } catch (error) {
    console.error('[GET /api/risk] assessment failed', error);
    return Response.json({ error: 'Nie udało się ocenić ryzyka' }, { status: 500 });
  }
}
