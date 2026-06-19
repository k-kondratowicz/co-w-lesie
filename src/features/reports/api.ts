import type { CreateReportInput } from '@/features/reports/schemas/create-report.schema';
import type { CreateReportResponse, ReportsGeoJSON, UploadReportResponse, VoteResponse } from '@/features/reports/types';
import { get, post } from '@/shared/lib/api/fetch';

export const reportsApi = {
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
