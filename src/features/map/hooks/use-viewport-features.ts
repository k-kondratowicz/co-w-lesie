'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReportsGeoJSON, reportsApi } from '@/features/core/report';
import { bansApi, kmzbApi } from '@/features/map/api';
import type { BansGeoJSON, KmzbGeoJSON } from '@/features/map/types';

type ViewportGeoJSON = ReportsGeoJSON | BansGeoJSON | KmzbGeoJSON;

type EndpointKey = 'reports' | 'bans' | 'kmzb';

function fetchFeatures(endpoint: EndpointKey, bbox: string, since: string | null): Promise<ViewportGeoJSON> {
  if (endpoint === 'bans') {
    return bansApi.list(bbox);
  }

  if (endpoint === 'kmzb') {
    return kmzbApi.list(bbox);
  }

  return reportsApi.list(bbox, since);
}

/**
 * GeoJSON features for the current map viewport. Re-fetches when the bbox changes (the map owns
 * the bbox and updates it on load/moveend) and whenever something invalidates [`queryKey`, ...].
 * Keeps the previous result while refetching so the layer doesn't flicker on pan. `enabled` lets
 * callers skip the fetch (e.g. hide a heavy layer below a zoom threshold).
 */
export function useViewportFeatures(
  endpoint: EndpointKey,
  queryKey: string,
  bbox: string | null,
  enabled = true,
  since: string | null = null,
): ViewportGeoJSON | null {
  const { data } = useQuery({
    queryKey: [queryKey, endpoint, bbox, since],
    queryFn: () => fetchFeatures(endpoint, bbox as string, since),
    enabled: enabled && bbox !== null,
    placeholderData: keepPreviousData,
  });

  return data ?? null;
}
