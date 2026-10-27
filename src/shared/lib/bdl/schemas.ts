import { z } from 'zod';

// BDL fields can change without notice, so every response is validated before it touches the DB.

/** Minimal GeoJSON geometry check - coordinates are passed verbatim to ST_GeomFromGeoJSON. */
const geometrySchema = z
  .object({
    type: z.string(),
    coordinates: z.array(z.unknown()),
  })
  .nullable();

/** Builds a GeoJSON FeatureCollection schema for a given properties shape. */
export function featureCollectionSchema<T extends z.ZodTypeAny>(properties: T) {
  return z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        properties,
        geometry: geometrySchema,
      }),
    ),
    // BDL sends the capped-page flag both top-level and under `properties`.
    exceededTransferLimit: z.boolean().optional(),
    properties: z.object({ exceededTransferLimit: z.boolean().optional() }).optional(),
  });
}

export const fireHazardProps = z.object({
  strefa: z.string(),
  kod: z.string(),
  data: z.string(),
  godz: z.string(),
});

// The ban layer's dates were strings until BDL retyped them to esriFieldTypeDate (epoch ms) in Oct 2026.
// GeoJSON drops a date it can't represent (BDL's 0001-01-01 "no end" sentinel), so the key can be missing.
const bdlDate = z.union([z.number(), z.string()]).nullish();

export const entryBanProps = z.object({
  objectid: z.number(),
  kod: z.string().nullable(),
  opis: z.string().nullable(),
  data: bdlDate,
  data_koncowa: bdlDate,
  nazwa_nadl: z.string().nullable(),
});

export const forestCompartmentProps = z.object({
  compartment_id: z.number(),
});

export type FireHazardProps = z.infer<typeof fireHazardProps>;
export type EntryBanProps = z.infer<typeof entryBanProps>;
export type GeoJsonGeometry = z.infer<typeof geometrySchema>;
