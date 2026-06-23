import { bansApi, contextApi, kmzbApi } from '@/features/map/api';
import { pushApi } from '@/features/push/api';
import { reportsApi } from '@/features/reports/api';
import { riskApi } from '@/features/safety/api';
import { savedAreasApi } from '@/features/saved-areas/api';

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
