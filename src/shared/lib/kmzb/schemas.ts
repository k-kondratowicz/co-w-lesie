import { z } from 'zod';

// The iMapLite response is unofficial and may change without notice, so we validate it and skip
// anything malformed rather than trusting its shape. Only the fields we ingest are modelled.

export const kmzbFeatureSchema = z.object({
  attributes: z.object({
    OBJECTID: z.number(),
    Status: z.string(),
    Typ: z.string(),
    TERYT: z.string().nullish(),
    'Data utworzenia': z.number(),
    'Data zdarzenia': z.number().nullish(),
  }),
  geometry: z.object({ x: z.number(), y: z.number() }).nullable(),
});

export type KmzbFeature = z.infer<typeof kmzbFeatureSchema>;

// A feature we can actually place on the map. Cluster responses (geometry: null) are handled by
// subdividing the bbox, never inserted.
export type KmzbPointFeature = KmzbFeature & { geometry: NonNullable<KmzbFeature['geometry']> };

// Envelope: `clusters` non-empty means the bbox is too dense and must be subdivided.
export const kmzbResponseSchema = z.object({
  features: z.array(z.unknown()),
  clusters: z.array(z.unknown()),
});
