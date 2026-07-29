import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { bboxParamSchema } from '@/shared/lib/geo/bbox';
import { prisma } from '@/shared/lib/prisma';
import { tourismPoiKindSchema } from '@/shared/lib/tourism/types';

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // reads live data; never cache.

// GET /api/tourism?bbox=minLng,minLat,maxLng,maxLat&kinds=PARKING,VEHICLE_STOP
// BDL tourism points (forest parking, vehicle stops, camping spots) in the viewport, as a GeoJSON
// FeatureCollection. Convenience data from Lasy Panstwowe - absence of a point is not a statement
// about what is allowed there.
type TourismRow = { id: string; kind: string; name: string | null; geojson: string };

const kindsParamSchema = z
  .string()
  .transform((value) => value.split(',').filter(Boolean))
  .pipe(z.array(tourismPoiKindSchema).min(1));

export async function GET(request: NextRequest) {
  const bbox = bboxParamSchema.safeParse(request.nextUrl.searchParams.get('bbox') ?? '');
  if (!bbox.success) {
    return Response.json({ error: 'Nieprawidłowy bbox', issues: z.flattenError(bbox.error) }, { status: 400 });
  }

  const kinds = kindsParamSchema.safeParse(request.nextUrl.searchParams.get('kinds') ?? '');
  if (!kinds.success) {
    return Response.json({ error: 'Nieprawidłowy typ obiektu', issues: z.flattenError(kinds.error) }, { status: 400 });
  }

  const [minLng, minLat, maxLng, maxLat] = bbox.data;
  const rows = await prisma.$queryRaw<TourismRow[]>`
    SELECT "id", "kind", "name", ST_AsGeoJSON("geom") AS geojson
    FROM "tourism_poi"
    WHERE "kind" = ANY(${kinds.data})
      AND ST_Intersects("geom", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
    LIMIT 5000
  `;

  return Response.json({
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: { id: row.id, kind: row.kind, name: row.name },
    })),
  });
}
