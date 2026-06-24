import { DAY_MS } from '@/shared/lib/date/time';
import {
  KMZB_BASE_URL,
  KMZB_FETCH_RETRIES,
  KMZB_FETCH_RETRY_BASE_MS,
  KMZB_FETCH_TIMEOUT_MS,
  KMZB_MAX_SUBDIVIDE_DEPTH,
  KMZB_PL_BBOX,
  KMZB_SINCE_DAYS,
  KMZB_STATUSES,
  KMZB_TILE_SIZE,
  KMZB_TYPES,
} from './config';
import { type KmzbPointFeature, kmzbFeatureSchema, kmzbResponseSchema } from './schemas';

// Network I/O against the iMapLite service. The service returns aggregate clusters instead of
// raw features when a bbox holds too many points, so we recurse into quadrants until it yields
// features (or we hit the depth cap). EPSG:2180 throughout; reprojection happens in mappers.

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One tile fetch, hardened against the service's intermittent timeouts/connection drops: a
// per-attempt timeout plus bounded exponential backoff. Throws only once every attempt is spent.
export async function fetchTileJson(url: string): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= KMZB_FETCH_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(KMZB_FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        throw new Error(`KMZB HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      lastError = error;

      if (attempt < KMZB_FETCH_RETRIES) {
        await delay(KMZB_FETCH_RETRY_BASE_MS * 2 ** attempt);
      }
    }
  }

  throw lastError;
}

function buildFilter(): string {
  const sinceMs = Date.now() - KMZB_SINCE_DAYS * DAY_MS;
  const statusPart = `('Status'=${KMZB_STATUSES.map((status) => `"${status}"`).join(',')})`;
  const typePart = `('Typ'=${KMZB_TYPES.map((type) => `"${type}"`).join(',')})`;
  const datePart = `('Data utworzenia'>=${sinceMs})`;

  return `${statusPart} AND ${typePart} AND ${datePart}`;
}

async function fetchTile(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  filter: string,
  depth = 0,
): Promise<KmzbPointFeature[]> {
  const url = `${KMZB_BASE_URL}?bbox=${minX},${minY},${maxX},${maxY}&s=1&filtr=${encodeURIComponent(filter)}`;
  const data = kmzbResponseSchema.parse(await fetchTileJson(url));

  if (data.clusters.length > 0 && depth < KMZB_MAX_SUBDIVIDE_DEPTH) {
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const quadrants = await Promise.all([
      fetchTile(minX, minY, midX, midY, filter, depth + 1),
      fetchTile(midX, minY, maxX, midY, filter, depth + 1),
      fetchTile(minX, midY, midX, maxY, filter, depth + 1),
      fetchTile(midX, midY, maxX, maxY, filter, depth + 1),
    ]);

    return quadrants.flat();
  }

  const points: KmzbPointFeature[] = [];
  for (const raw of data.features) {
    const parsed = kmzbFeatureSchema.safeParse(raw);
    if (parsed.success && parsed.data.geometry) {
      points.push(parsed.data as KmzbPointFeature);
    }
  }

  return points;
}

export async function fetchKmzbFeatures(): Promise<KmzbPointFeature[]> {
  const filter = buildFilter();
  const seen = new Set<number>();
  const all: KmzbPointFeature[] = [];

  for (let x = KMZB_PL_BBOX.minX; x < KMZB_PL_BBOX.maxX; x += KMZB_TILE_SIZE) {
    for (let y = KMZB_PL_BBOX.minY; y < KMZB_PL_BBOX.maxY; y += KMZB_TILE_SIZE) {
      const features = await fetchTile(x, y, x + KMZB_TILE_SIZE, y + KMZB_TILE_SIZE, filter);
      for (const feature of features) {
        // Adjacent tiles overlap on shared edges; dedupe by the service's stable id.
        if (!seen.has(feature.attributes.OBJECTID)) {
          seen.add(feature.attributes.OBJECTID);
          all.push(feature);
        }
      }
    }
  }

  return all;
}
