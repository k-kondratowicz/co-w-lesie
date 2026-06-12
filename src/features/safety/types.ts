import type { RiskResult } from '@/features/risk/types';

// Shape returned by GET /api/risk: the engine result plus the assistant message and freshness.
export type RiskAssessment = RiskResult & {
  message: string;
  /** Freshness of the time-sensitive BDL signals (fire forecast / ban sync), or null if unknown. */
  dataAsOf: string | null;
  /** Details of the active entry ban, when there is one. */
  ban: { reason: string | null; until: string | null } | null;
  /** Active bans nearby (within the radius) that don't contain the point. */
  nearbyBans: { count: number; nearestMeters: number | null };
};
