import type { z } from 'zod';
import { featureCollectionSchema } from './schemas';

// Thin ArcGIS REST query client. I/O only: fetch + paginate + zod-validate.
// Returns features with non-null geometry; the server reprojects to EPSG:4326.

const PAGE_SIZE = 1000; // <= every BDL layer's maxRecordCount
const MAX_PAGES = 1000; // safety bound against runaway pagination

export type QueryOptions = {
  /** Fields to return (must include the layer's OID field for stable ordering). */
  outFields: string[];
  /** OID field name used for deterministic paging order. */
  orderByField: string;
  /** ArcGIS `where` clause; defaults to all rows. */
  where?: string;
  /** Optional envelope filter "minLng,minLat,maxLng,maxLat" in EPSG:4326. */
  bbox?: [number, number, number, number];
  /**
   * Server-side geometry simplification tolerance, in outSR units (degrees here).
   * BDL polygons are extremely detailed (a single fire zone can be tens of MB raw);
   * 0.0005 ≈ 55 m, plenty for point-in-polygon checks and required to page at all.
   */
  maxAllowableOffset?: number;
};

export type ValidatedFeature<P> = { properties: P; geometry: { type: string; coordinates: unknown[] } };

/**
 * Pages through an ArcGIS feature layer as GeoJSON (EPSG:4326), yielding one page of
 * features at a time. Properties are validated with `propsSchema`; features without
 * geometry are dropped (a polygon-layer row with null geometry is unusable). Streaming
 * keeps memory bounded to a single page, which matters for large layers (~455k features).
 */
export async function* fetchFeaturePages<T extends z.ZodTypeAny>(
  layerUrl: string,
  propsSchema: T,
  options: QueryOptions,
): AsyncGenerator<ValidatedFeature<z.infer<T>>[]> {
  const collectionSchema = featureCollectionSchema(propsSchema);

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      f: 'geojson',
      where: options.where ?? '1=1',
      outFields: options.outFields.join(','),
      orderByFields: options.orderByField,
      outSR: '4326',
      returnGeometry: 'true',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(page * PAGE_SIZE),
    });

    if (options.maxAllowableOffset !== undefined) {
      params.set('maxAllowableOffset', String(options.maxAllowableOffset));
    }

    if (options.bbox) {
      params.set('geometry', options.bbox.join(','));
      params.set('geometryType', 'esriGeometryEnvelope');
      params.set('inSR', '4326');
      params.set('spatialRel', 'esriSpatialRelIntersects');
    }

    const response = await fetch(`${layerUrl}/query?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`BDL query failed (${response.status} ${response.statusText}) for ${layerUrl}`);
    }

    // Runtime is validated by zod; the explicit type avoids the gnarly inferred type of a
    // generic ZodObject so `feature.properties` / `feature.geometry` resolve cleanly.
    const parsed = collectionSchema.parse(await response.json()) as unknown as {
      features: { properties: z.infer<T>; geometry: { type: string; coordinates: unknown[] } | null }[];
    };

    const validFeatures: ValidatedFeature<z.infer<T>>[] = [];
    for (const feature of parsed.features) {
      if (feature.geometry) {
        validFeatures.push({ properties: feature.properties, geometry: feature.geometry });
      }
    }
    yield validFeatures;

    if (parsed.features.length < PAGE_SIZE) {
      break;
    }
  }
}

/** Collects every matching feature into an array (for small layers — fire, bans). */
export async function fetchAllFeatures<T extends z.ZodTypeAny>(
  layerUrl: string,
  propsSchema: T,
  options: QueryOptions,
): Promise<ValidatedFeature<z.infer<T>>[]> {
  const features: ValidatedFeature<z.infer<T>>[] = [];
  for await (const page of fetchFeaturePages(layerUrl, propsSchema, options)) {
    features.push(...page);
  }
  return features;
}
