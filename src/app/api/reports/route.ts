import type { ReportType } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { createReportSchema } from '@/features/reports/schemas/create-report.schema';
import { isPointNearForest, REPORT_FOREST_BUFFER_METERS } from '@/shared/lib/geo/queries/near-forest';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // GET reads live data; never cache.

// POST /api/reports — create a community report.
// Body: { type: ReportType, description?: string, location: [lng, lat] }  (GeoJSON order)
export async function POST(request: Request) {
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

  const { type, description, location } = parsed.data;
  const [lng, lat] = location;

  try {
    if (!(await isPointNearForest(prisma, lng, lat, REPORT_FOREST_BUFFER_METERS))) {
      return Response.json({ error: 'Zgłoszenia można dodawać tylko w lesie lub w jego pobliżu.' }, { status: 422 });
    }

    const report = await prisma.report.create({
      data: { type, lat, lng, description: description?.trim() || null },
      select: { id: true },
    });
    return Response.json({ id: report.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/reports] create failed', error);
    return Response.json({ error: 'Nie udało się zapisać zgłoszenia' }, { status: 500 });
  }
}

// GET /api/reports?bbox=minLng,minLat,maxLng,maxLat&since=ISO
// Returns a GeoJSON FeatureCollection — the source for the clustered map layer.
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
    return Response.json({ error: 'Nieprawidłowe parametry zapytania', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data.bbox;
  const since = parsed.data.since ? new Date(parsed.data.since) : null;

  const rows = await prisma.$queryRaw<ReportRow[]>`
    SELECT "id", "type", "description", "createdAt", "lng", "lat"
    FROM "Report"
    WHERE ST_Intersects("geog", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography)
      AND (${since}::timestamptz IS NULL OR "createdAt" > ${since}::timestamptz)
    ORDER BY "createdAt" DESC
    LIMIT 2000
  `;

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((report) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [report.lng, report.lat] },
      properties: {
        id: report.id,
        type: report.type,
        description: report.description,
        createdAt: report.createdAt.toISOString(),
      },
    })),
  });
}
