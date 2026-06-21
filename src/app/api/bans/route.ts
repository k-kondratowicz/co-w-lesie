import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { bboxParamSchema } from '@/shared/lib/geo/bbox';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/bans?bbox=minLng,minLat,maxLng,maxLat
// Active forest-entry-ban polygons in the viewport, as a GeoJSON FeatureCollection.
type BanRow = { id: string; reason: string | null; until: Date | null; geojson: string };

export async function GET(request: NextRequest) {
  const parsed = bboxParamSchema.safeParse(request.nextUrl.searchParams.get('bbox') ?? '');
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowy bbox', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data;
  const rows = await prisma.$queryRaw<BanRow[]>`
    SELECT "id", "reason", "until", ST_AsGeoJSON("geom") AS geojson
    FROM "forest_entry_ban"
    WHERE ST_Intersects("geom", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
      AND ("until" IS NULL OR "until" > now())
    LIMIT 5000
  `;

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: { id: row.id, reason: row.reason, until: row.until?.toISOString() ?? null },
    })),
  });
}
