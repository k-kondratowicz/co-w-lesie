import type { RiskAssessment } from '@/features/safety/types';
import { get } from '@/shared/lib/api/fetch';

export const riskApi = {
  assess(lat: number, lng: number, radius?: number) {
    return get<RiskAssessment>('/api/risk', {
      lat: String(lat),
      lng: String(lng),
      radius: radius !== undefined ? String(radius) : undefined,
    });
  },
};
