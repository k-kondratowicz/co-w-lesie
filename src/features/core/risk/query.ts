import type { UseQueryOptions } from '@tanstack/react-query';
import { riskApi } from './api';
import type { RiskAssessment } from './assessment';
import { DEFAULT_RADIUS_METERS } from './config';

// Single source for the risk query key + fetcher, shared by the assistant (one point) and the
// saved-areas list (one per area). They MUST resolve to the same cache entry: opening a saved
// area offline relies on reading the result the list already warmed. 'offlineFirst' makes the
// query serve persisted data when the network is gone instead of staying paused with no data.
export function riskQueryOptions(
  lat: number,
  lng: number,
  radiusMeters?: number,
): Pick<UseQueryOptions<RiskAssessment>, 'queryKey' | 'queryFn' | 'networkMode'> {
  // The server defaults an omitted radius to DEFAULT_RADIUS_METERS, so undefined and 5000 are the
  // same request. Normalize before keying/fetching, or the assistant and the saved-areas list cache
  // the same point under different keys and refetch needlessly.
  const radius = radiusMeters ?? DEFAULT_RADIUS_METERS;

  return {
    queryKey: ['risk', lat, lng, radius],
    queryFn: () => riskApi.assess(lat, lng, radius),
    networkMode: 'offlineFirst',
  };
}
