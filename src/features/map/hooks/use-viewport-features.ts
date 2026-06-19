'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { BansGeoJSON } from '@/features/map/types';
import type { ReportsGeoJSON } from '@/features/reports/types';
import { api } from '@/shared/lib/api/client';

type ViewportGeoJSON = ReportsGeoJSON | BansGeoJSON;

type EndpointKey = 'reports' | 'bans';

function fetchFeatures(endpoint: EndpointKey, bbox: string, since: string | null): Promise<ViewportGeoJSON> {
  if (endpoint === 'bans') {
    return api.bans.list(bbox);
  }

  return api.reports.list(bbox, since);
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
