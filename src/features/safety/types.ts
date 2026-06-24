import type { RiskResult } from '@/features/core/risk';
import type { KmzbAdvisory } from '@/shared/lib/geo/queries/kmzb-advisory';

// Shape returned by GET /api/risk: the engine result plus the assistant message and freshness.
export type RiskAssessment = RiskResult & {
  message: string;
  /** Freshness of the fire-hazard forecast for this point, or null if unknown. */
  fireAsOf: string | null;
  /** When entry bans were last synced, or null if unknown. */
  bansAsOf: string | null;
  /** When KMZB police incidents were last synced, or null if unknown. */
  kmzbAsOf: string | null;
  /** Details of the active entry ban, when there is one. */
  ban: { reason: string | null; until: string | null } | null;
  /** Active bans nearby (within the radius) that don't contain the point. */
  nearbyBans: { count: number; nearestMeters: number | null };
  /** Police-reported poaching / grass-burning nearby (last week). Informational only, not scored. */
  kmzbAdvisory: KmzbAdvisory;
};
