'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

async function fetchFeatures(path: string, bbox: string, since: string | null): Promise<GeoJSON.FeatureCollection> {
  const params = new URLSearchParams({ bbox });
  if (since) {
    params.set('since', since);
  }

  const response = await fetch(`${path}?${params}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }

  return response.json();
}

/**
 * GeoJSON features for the current map viewport. Re-fetches when the bbox changes (the map owns
 * the bbox and updates it on load/moveend) and whenever something invalidates [`queryKey`, ...].
 * Keeps the previous result while refetching so the layer doesn't flicker on pan. `enabled` lets
 * callers skip the fetch (e.g. hide a heavy layer below a zoom threshold).
 */
export function useViewportFeatures(
  path: string,
  queryKey: string,
  bbox: string | null,
  enabled = true,
  since: string | null = null,
): GeoJSON.FeatureCollection | null {
  const { data } = useQuery({
    queryKey: [queryKey, bbox, since],
    queryFn: () => fetchFeatures(path, bbox as string, since),
    enabled: enabled && bbox !== null,
    placeholderData: keepPreviousData,
  });
  return data ?? null;
}
