import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildPointContext, queryPointContext } from '@/shared/lib/geo/queries/point-context';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/context?lat=&lng= — forest / fire-hazard / entry-ban status for a point.
const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({ lat: params.get('lat'), lng: params.get('lng') });
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe współrzędne', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const { lat, lng } = parsed.data;

  try {
    const row = await queryPointContext(prisma, lng, lat);
    return Response.json(buildPointContext(row, lng, lat));
  } catch (error) {
    console.error('[GET /api/context] query failed', error);
    return Response.json({ error: 'Nie udało się pobrać kontekstu lokalizacji' }, { status: 500 });
  }
}
