import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { expiryFrom } from '@/features/reports/lifecycle';
import { createReportSchema } from '@/features/reports/schemas/create-report.schema';
import { clientIp } from '@/shared/lib/client-ip';
import { isPointNearForest, REPORT_FOREST_BUFFER_METERS } from '@/shared/lib/geo/queries/near-forest';
import { queryReportsInBbox } from '@/shared/lib/geo/queries/reports-in-bbox';
import { prisma } from '@/shared/lib/prisma';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { verifyTurnstile } from '@/shared/lib/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const limit = await checkRateLimit(`report:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);

  if (!limit.ok) {
    return Response.json(
      { error: 'Zbyt wiele zgłoszeń. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane zgłoszenia' }, { status: 400 });
  }

  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane zgłoszenia', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const turnstileToken = (body as { turnstileToken?: unknown }).turnstileToken;
  if (!(await verifyTurnstile(typeof turnstileToken === 'string' ? turnstileToken : null, clientIp(request)))) {
    return Response.json({ error: 'Weryfikacja nie powiodła się. Odśwież stronę i spróbuj ponownie.' }, { status: 403 });
  }

  const { type, description, location, imageKey } = parsed.data;
  const [lng, lat] = location;

  try {
    if (!(await isPointNearForest(prisma, lng, lat, REPORT_FOREST_BUFFER_METERS))) {
      return Response.json({ error: 'Zgłoszenia można dodawać tylko w lesie lub w jego pobliżu.' }, { status: 422 });
    }

    const report = await prisma.report.create({
      data: { type, lat, lng, description: description?.trim() || null, imageKey: imageKey ?? null, expiresAt: expiryFrom(type) },
      select: { id: true },
    });

    return Response.json({ id: report.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reports] create failed', error);

    return Response.json({ error: 'Nie udało się zapisać zgłoszenia' }, { status: 500 });
  }
}

const bboxSchema = z
  .string()
  .transform((value) => value.split(',').map(Number))
  .pipe(z.tuple([z.number(), z.number(), z.number(), z.number()]))
  .refine(([minLng, minLat, maxLng, maxLat]) => minLng < maxLng && minLat < maxLat, 'Nieprawidłowy bbox');

const querySchema = z.object({
  bbox: bboxSchema,
  since: z.iso.datetime({ offset: true }).optional(),
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    bbox: params.get('bbox') ?? undefined,
    since: params.get('since') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe parametry zapytania', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data.bbox;
  const since = parsed.data.since ? new Date(parsed.data.since) : null;

  return Response.json(await queryReportsInBbox(prisma, minLng, minLat, maxLng, maxLat, since));
}
