import type { BansGeoJSON, KmzbGeoJSON, OvernightZonesGeoJSON, TourismGeoJSON } from '@/features/map/types';
import { get } from '@/shared/lib/api/fetch';
import type { PointContext } from '@/shared/lib/geo/queries/point-context';

export const bansApi = {
  list(bbox: string) {
    return get<BansGeoJSON>('/api/bans', { bbox });
  },
};

export const kmzbApi = {
  list(bbox: string) {
    return get<KmzbGeoJSON>('/api/kmzb', { bbox });
  },
};

export const tourismApi = {
  list(bbox: string, kinds: string) {
    return get<TourismGeoJSON>('/api/tourism', { bbox, kinds });
  },
};

export const overnightZonesApi = {
  list(bbox: string) {
    return get<OvernightZonesGeoJSON>('/api/overnight-zones', { bbox });
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
