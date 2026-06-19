import type { ReportType } from '@prisma/client';

export type CreateReportResponse = { id: string };

export type UploadReportResponse = { key: string };

export type VoteResponse = {
  confirmations: number;
  flags: number;
  alreadyVoted?: boolean;
};

export type ReportFeatureProperties = {
  id: string;
  type: ReportType;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  confirmations: number;
  flags: number;
  imageUrl: string | null;
  opacity: number;
};

export type ReportsGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Point, ReportFeatureProperties>;
