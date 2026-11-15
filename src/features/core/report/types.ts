// Mirrors the Prisma enum on purpose (see the parity test) so client code never imports @prisma/client.
export const REPORT_TYPES = [
  'BLOOD',
  'FIRE',
  'HUNTING',
  'SHOTS',
  'VACCINATION',
  'DEAD_ANIMAL',
  'AGGRESSIVE_ANIMAL',
  'BLOCKED_PATH',
  'ILLEGAL_DUMP',
  'SHOTS_HEARD',
  'OTHER',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

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

export type SingleReportResponse = {
  id: string;
  type: ReportType;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  confirmations: number;
  flags: number;
  imageUrl: string | null;
  lng: number;
  lat: number;
};
