import type { BansGeoJSON } from '@/features/map/types';
import { get } from '@/shared/lib/api/fetch';
import type { PointContext } from '@/shared/lib/geo/queries/point-context';

export const bansApi = {
  list(bbox: string) {
    return get<BansGeoJSON>('/api/bans', { bbox });
  },
};

export const contextApi = {
  get(lat: number, lng: number) {
    return get<PointContext>('/api/context', {
      lat: String(lat),
      lng: String(lng),
    });
  },
};
