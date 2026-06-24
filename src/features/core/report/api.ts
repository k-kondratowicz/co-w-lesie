import { get, post } from '@/shared/lib/api/fetch';
import type { CreateReportInput } from './schema';
import type { CreateReportResponse, ReportsGeoJSON, SingleReportResponse, UploadReportResponse, VoteResponse } from './types';

export const reportsApi = {
  get(id: string) {
    return get<SingleReportResponse>(`/api/reports/${id}`);
  },

  list(bbox: string, since?: string | null) {
    return get<ReportsGeoJSON>('/api/reports', {
      bbox,
      since: since ?? undefined,
    });
  },

  create(input: CreateReportInput, turnstileToken: string | null) {
    return post<CreateReportResponse>('/api/reports', {
      ...input,
      turnstileToken,
    });
  },

  vote(id: string, kind: 'CONFIRM' | 'FLAG', lat: number, lng: number) {
    return post<VoteResponse>(`/api/reports/${id}/vote`, {
      kind,
      lat,
      lng,
    });
  },

  upload(blob: Blob) {
    return post<UploadReportResponse>('/api/reports/upload', blob, {
      'Content-Type': blob.type,
    });
  },
};
