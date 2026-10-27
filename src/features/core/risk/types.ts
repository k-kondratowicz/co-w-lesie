import type { ReportType } from '@prisma/client';

/** UNKNOWN replaces GREEN when our own sync of a nationwide signal is stale (see `SignalState`). */
export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type InForestStatus = 'IN' | 'OUT' | 'UNKNOWN';

/**
 * How far a nationwide signal (fire, bans) can be vouched for. STALE = our sync failed or never
 * ran, so even "no hazard" is unconfirmed; NO_DATA = synced, but BDL publishes nothing for the point.
 */
export type SignalState = 'CURRENT' | 'STALE' | 'NO_DATA';

/** A report within the query radius, with its age precomputed by the caller (keeps the engine pure). */
export type RiskReport = { type: ReportType; ageDays: number };

export type RiskInput = {
  reports: RiskReport[];
  fireDegree: 0 | 1 | 2 | 3 | null;
  entryBan: boolean;
  fireState: SignalState;
  entryBanState: SignalState;
  inForest: InForestStatus;
  radiusMeters: number;
};

export type RiskSignals = {
  reports: { count: number; score: number };
  fire: { degree: 0 | 1 | 2 | 3 | null; score: number; state: SignalState };
  entryBan: { active: boolean; state: SignalState };
  inForest: InForestStatus;
};

export type RiskResult = {
  score: number; // 0..100
  level: RiskLevel;
  radiusMeters: number;
  signals: RiskSignals;
};
