import type { UseQueryOptions } from '@tanstack/react-query';
import type { RiskAssessment } from '@/features/safety/types';
import { api } from '@/shared/lib/api/client';

// Single source for the risk query key + fetcher, shared by the assistant (one point) and the
// saved-areas list (one per area). They MUST resolve to the same cache entry: opening a saved
// area offline relies on reading the result the list already warmed. 'offlineFirst' makes the
// query serve persisted data when the network is gone instead of staying paused with no data.
export function riskQueryOptions(
  lat: number,
  lng: number,
  radiusMeters?: number,
): Pick<UseQueryOptions<RiskAssessment>, 'queryKey' | 'queryFn' | 'networkMode'> {
  return {
    queryKey: ['risk', lat, lng, radiusMeters],
    queryFn: () => api.risk.assess(lat, lng, radiusMeters),
    networkMode: 'offlineFirst',
  };
}
