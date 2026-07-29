import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { bboxParamSchema } from '@/shared/lib/geo/bbox';
import { prisma } from '@/shared/lib/prisma';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/overnight-zones?bbox=minLng,minLat,maxLng,maxLat
// Areas of the Lasy Panstwowe "Zanocuj w lesie" programme in the viewport, as a GeoJSON
// FeatureCollection. Being inside a zone does not override an entry ban or fire hazard - the risk
// assessment stays the authority on whether entering is safe.
type OvernightZoneRow = { id: string; name: string | null; geojson: string };

export async function GET(request: NextRequest) {
  const parsed = bboxParamSchema.safeParse(request.nextUrl.searchParams.get('bbox') ?? '');
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowy bbox', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = parsed.data;
  const rows = await prisma.$queryRaw<OvernightZoneRow[]>`
    SELECT "id", "name", ST_AsGeoJSON("geom") AS geojson
    FROM "overnight_zone"
    WHERE ST_Intersects("geom", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    LIMIT 2000
  `;

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: { id: row.id, name: row.name },
    })),
  });
}
