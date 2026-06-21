import { bansApi, contextApi, kmzbApi } from '@/features/map/api';
import { reportsApi } from '@/features/reports/api';
import { riskApi } from '@/features/safety/api';

export { ApiError } from './fetch';

export const api = {
  reports: reportsApi,
  risk: riskApi,
  bans: bansApi,
  kmzb: kmzbApi,
  context: contextApi,
};
