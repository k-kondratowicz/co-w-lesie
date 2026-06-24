import { get } from '@/shared/lib/api/fetch';
import type { RiskAssessment } from './assessment';

export const riskApi = {
  assess(lat: number, lng: number, radius?: number) {
    return get<RiskAssessment>('/api/risk', {
      lat: String(lat),
      lng: String(lng),
      radius: radius !== undefined ? String(radius) : undefined,
    });
  },
};
