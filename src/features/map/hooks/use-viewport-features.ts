'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type ReportsGeoJSON, reportsApi } from '@/features/core/report';
import { bansApi, kmzbApi, overnightZonesApi, tourismApi } from '@/features/map/api';
import type { BansGeoJSON, KmzbGeoJSON, OvernightZonesGeoJSON, TourismGeoJSON } from '@/features/map/types';

type ViewportGeoJSON = ReportsGeoJSON | BansGeoJSON | KmzbGeoJSON | TourismGeoJSON | OvernightZonesGeoJSON;

type EndpointKey = 'reports' | 'bans' | 'kmzb' | 'tourism' | 'overnight-zones';

function fetchFeatures(
  endpoint: EndpointKey,
  bbox: string,
  since: string | null,
  types: string | null,
): Promise<ViewportGeoJSON> {
  if (endpoint === 'bans') {
    return bansApi.list(bbox);
  }

  if (endpoint === 'kmzb') {
    return kmzbApi.list(bbox);
  }

  if (endpoint === 'overnight-zones') {
    return overnightZonesApi.list(bbox);
  }

  // `types` doubles as the tourism kind filter (PARKING,VEHICLE_STOP / CAMP_SITE,CAMP_FIELD).
  if (endpoint === 'tourism') {
    return tourismApi.list(bbox, types ?? '');
  }

  return reportsApi.list(bbox, since, types);
}

/**
 * GeoJSON features for the current map viewport. Re-fetches when the bbox changes (the map owns
 * the bbox and updates it on load/moveend) and whenever something invalidates [`queryKey`, ...].
 * Keeps the previous result while refetching so the layer doesn't flicker on pan. `enabled` lets
 * callers skip the fetch (e.g. hide a heavy layer below a zoom threshold); disabling also returns
 * null right away, otherwise the cached collection would keep the layer drawn after a user
 * switches it off.
 */
export function useViewportFeatures(
  endpoint: EndpointKey,
  queryKey: string,
  bbox: string | null,
  enabled = true,
  since: string | null = null,
  types: string | null = null,
): ViewportGeoJSON | null {
  const { data } = useQuery({
    queryKey: [queryKey, endpoint, bbox, since, types],
    queryFn: () => fetchFeatures(endpoint, bbox as string, since, types),
    enabled: enabled && bbox !== null,
    placeholderData: keepPreviousData,
  });

  return enabled ? (data ?? null) : null;
}
