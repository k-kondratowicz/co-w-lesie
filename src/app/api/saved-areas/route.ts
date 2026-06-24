import { z } from 'zod';
import { createSavedAreaSchema, MAX_SAVED_AREAS_PER_VISITOR } from '@/features/core/saved-area';
import {
  countSavedAreas,
  createSavedArea,
  findDuplicateArea,
  listSavedAreas,
} from '@/features/saved-areas/queries/saved-areas-repo';
import { prisma } from '@/shared/lib/prisma';
import { clientIp } from '@/shared/lib/security/client-ip';
import { checkRateLimit } from '@/shared/lib/security/rate-limit';
import { readVisitorId } from '@/shared/lib/security/visitor-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  return Response.json(await listSavedAreas(prisma, visitorId));
}

export async function POST(request: Request) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  const limit = await checkRateLimit(`saved-area:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return Response.json(
      { error: 'Zbyt wiele zapisanych obszarów. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane obszaru' }, { status: 400 });
  }

  const parsed = createSavedAreaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane obszaru', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  if (await findDuplicateArea(prisma, visitorId, parsed.data)) {
    return Response.json({ error: 'Ten obszar jest już zapisany.' }, { status: 409 });
  }

  if ((await countSavedAreas(prisma, visitorId)) >= MAX_SAVED_AREAS_PER_VISITOR) {
    return Response.json({ error: `Możesz zapisać maksymalnie ${MAX_SAVED_AREAS_PER_VISITOR} obszarów.` }, { status: 409 });
  }

  try {
    const area = await createSavedArea(prisma, visitorId, parsed.data);

    return Response.json(area, { status: 201 });
  } catch (error) {
    console.error('[POST /api/saved-areas] create failed', error);

    return Response.json({ error: 'Nie udało się zapisać obszaru' }, { status: 500 });
  }
}
