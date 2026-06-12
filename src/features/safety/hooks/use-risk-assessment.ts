'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { RiskAssessment } from '@/features/safety/types';
import { useRiskOverlayStore } from '@/shared/store/use-risk-overlay-store';

async function fetchRiskAssessment(lat: number, lng: number): Promise<RiskAssessment> {
  const res = await fetch(`/api/risk?lat=${lat}&lng=${lng}`);
  if (!res.ok) {
    throw new Error(`Risk request failed with status ${res.status}`);
  }
  return res.json();
}

type Target = { lat: number; lng: number };

/**
 * Owns the risk assessment for a chosen point: fetches GET /api/risk (refetching on point
 * change and via refetch()), and mirrors the result as the map's risk circle. The caller
 * decides how the target is picked (e.g. from geolocation).
 */
export function useRiskAssessment(enabled: boolean) {
  const [target, setTarget] = useState<Target | null>(null);
  const setOverlay = useRiskOverlayStore((state) => state.setOverlay);

  const query = useQuery({
    queryKey: ['risk', target?.lat, target?.lng],
    queryFn: async () => {
      if (!target) {
        throw new Error('No location selected');
      }
      return fetchRiskAssessment(target.lat, target.lng);
    },
    enabled: enabled && target !== null,
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (query.data && target) {
      setOverlay({ lat: target.lat, lng: target.lng, radiusMeters: query.data.radiusMeters, level: query.data.level });
    }
  }, [query.data, target, setOverlay]);

  return { target, setTarget, ...query };
}
