import type { ReportType } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ageOpacity, expiryFrom } from '@/features/reports/lifecycle';
import { createReportSchema } from '@/features/reports/schemas/create-report.schema';
import { clientIp } from '@/shared/lib/client-ip';
import { isPointNearForest, REPORT_FOREST_BUFFER_METERS } from '@/shared/lib/geo/queries/near-forest';
import { prisma } from '@/shared/lib/prisma';
import { reportImageUrl } from '@/shared/lib/r2';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { verifyTurnstile } from '@/shared/lib/turnstile';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // GET reads live data; never cache.

const RATE_LIMIT = 5; // reports per IP
const RATE_WINDOW_MS = 60_000; // per minute

// POST /api/reports - create a community report.
// Body: { type: ReportType, description?: string, location: [lng, lat] }  (GeoJSON order)
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

// GET /api/reports?bbox=minLng,minLat,maxLng,maxLat&since=ISO
// Returns a GeoJSON FeatureCollection - the source for the clustered map layer.
const bboxSchema = z
  .string()
  .transform((value) => value.split(',').map(Number))
  .pipe(z.tuple([z.number(), z.number(), z.number(), z.number()]))
  .refine(([minLng, minLat, maxLng, maxLat]) => minLng < maxLng && minLat < maxLat, 'Nieprawidłowy bbox');

const querySchema = z.object({
  bbox: bboxSchema,
  since: z.iso.datetime({ offset: true }).optional(),
});

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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    bbox: params.get('bbox') ?? undefined,
    since: params.get('since') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: 'Nieprawidłowe parametry zapytania',
        issues: z.flattenError(parsed.error),
      },
      { status: 400 },
    );
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data.bbox;
  const since = parsed.data.since ? new Date(parsed.data.since) : null;

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

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((report) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
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
        // Faded as the report ages; confirmations refresh the anchor (lastConfirmedAt).
        opacity: ageOpacity(report.type, report.lastConfirmedAt ?? report.createdAt),
      },
    })),
  });
}
