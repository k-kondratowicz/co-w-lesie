'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { riskQueryOptions } from '@/features/safety/risk-query';
import { useRiskOverlayStore } from '@/shared/store/use-risk-overlay-store';

type Target = { lat: number; lng: number; radiusMeters?: number };

/**
 * Owns the risk assessment for a chosen point: fetches GET /api/risk (refetching on point
 * change and via refetch()), and mirrors the result as the map's risk circle. The caller
 * decides how the target is picked (e.g. from geolocation).
 */
export function useRiskAssessment(enabled: boolean) {
  const [target, setTarget] = useState<Target | null>(null);
  const setOverlay = useRiskOverlayStore((state) => state.setOverlay);
  const clearOverlay = useRiskOverlayStore((state) => state.clearOverlay);

  const query = useQuery({
    ...riskQueryOptions(target?.lat ?? 0, target?.lng ?? 0, target?.radiusMeters),
    enabled: enabled && target !== null,
  });

  const data = query.data;

  useEffect(() => {
    if (!target) {
      return;
    }

    // While a freshly picked point is still loading its assessment, query.data is undefined.
    // Drop the previous circle rather than leave its stale colour on the map - in a safety app a
    // lingering wrong colour reads as a verdict for the new point.
    if (!data) {
      clearOverlay();
      return;
    }

    setOverlay({ lat: target.lat, lng: target.lng, radiusMeters: data.radiusMeters, level: data.level });
  }, [data, target, setOverlay, clearOverlay]);

  return { target, setTarget, ...query };
}
