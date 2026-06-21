import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { bboxParamSchema } from '@/shared/lib/geo/bbox';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/kmzb?bbox=minLng,minLat,maxLng,maxLat
// KMZB police incidents (near forests) in the viewport, as a GeoJSON FeatureCollection. A
// distinct layer from user reports - these are police-sourced, not crowd tips.
type KmzbRow = { id: string; type: string; status: string; event_at: Date | null; created_at: Date; geojson: string };

export async function GET(request: NextRequest) {
  const parsed = bboxParamSchema.safeParse(request.nextUrl.searchParams.get('bbox') ?? '');
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowy bbox', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data;
  const rows = await prisma.$queryRaw<KmzbRow[]>`
    SELECT "id", "type", "status", "event_at", "created_at", ST_AsGeoJSON("geom") AS geojson
    FROM "kmzb_report"
    WHERE ST_Intersects("geom", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    LIMIT 5000
  `;

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        type: row.type,
        status: row.status,
        eventAt: row.event_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
      },
    })),
  });
}
