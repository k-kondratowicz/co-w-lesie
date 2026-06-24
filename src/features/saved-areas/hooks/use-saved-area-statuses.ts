'use client';

import { useQueries } from '@tanstack/react-query';
import type { RiskLevel } from '@/features/core/risk';
import { riskQueryOptions } from '@/features/core/risk';
import type { SavedArea } from '@/features/core/saved-area';
import { useSavedAreas } from '@/features/core/saved-area/client';

export type SavedAreaStatus = {
  /** undefined until a risk result is cached for this area (offline before first fetch). */
  level: RiskLevel | undefined;
  /** When the cached result was fetched (epoch ms), 0 if never. */
  updatedAt: number;
};

// Saved areas plus a last-known risk status per area. Mounting this warms the risk cache while
// online (one query per area, sharing the assistant's key); offline it reads the persisted result.
// Used both headlessly (warm on page load) and by the list (display).
export function useSavedAreaStatuses() {
  const saved = useSavedAreas();

  const statuses = useQueries({
    queries: saved.areas.map((area) => riskQueryOptions(area.lat, area.lng, area.radiusMeters)),
  });

  const statusFor = (area: SavedArea): SavedAreaStatus => {
    const index = saved.areas.indexOf(area);
    const query = statuses[index];

    return {
      level: query?.data?.level,
      updatedAt: query?.dataUpdatedAt ?? 0,
    };
  };

  return {
    ...saved,
    statusFor,
  };
}
