import { reportsApi } from '@/features/core/report';
import { riskApi } from '@/features/core/risk';
import { savedAreasApi } from '@/features/core/saved-area';
import { bansApi, contextApi, kmzbApi } from '@/features/map/api';
import { pushApi } from '@/features/push/api';

export { ApiError } from './fetch';

export const api = {
  reports: reportsApi,
  risk: riskApi,
  bans: bansApi,
  kmzb: kmzbApi,
  context: contextApi,
  savedAreas: savedAreasApi,
  push: pushApi,
};
