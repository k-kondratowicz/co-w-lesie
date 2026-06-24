import type { ReportType } from '@prisma/client';

export type PopupReport = {
  id: string;
  type: ReportType;
  description: string | null;
  createdAt: string;
  expiresAt: string | null;
  confirmations: number;
  flags: number;
  imageUrl: string | null;
};

export type PopupInfo = { lng: number; lat: number; reports: PopupReport[] };
