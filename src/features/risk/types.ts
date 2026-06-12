import type { ReportType } from '@prisma/client';

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export type InForestStatus = 'IN' | 'OUT' | 'UNKNOWN';

/** A report within the query radius, with its age precomputed by the caller (keeps the engine pure). */
export type RiskReport = { type: ReportType; ageDays: number };

export type RiskInput = {
  reports: RiskReport[];
  fireDegree: 0 | 1 | 2 | 3 | null;
  entryBan: boolean;
  inForest: InForestStatus;
  radiusMeters: number;
};

export type RiskSignals = {
  reports: { count: number; score: number };
  fire: { degree: 0 | 1 | 2 | 3 | null; score: number };
  entryBan: { active: boolean };
  inForest: InForestStatus;
};

export type RiskResult = {
  score: number; // 0..100
  level: RiskLevel;
  radiusMeters: number;
  signals: RiskSignals;
};
