import type { ReportType } from '@prisma/client';

// Risk-engine tunables — the product "knobs". Keep all magic numbers here, never inline in
// the scoring logic, so they can be adjusted (and reasoned about) in one place.

/** Per-type severity (0..1). Gunfire/hunting highest; informational/littering lowest. */
export const TYPE_WEIGHTS: Record<ReportType, number> = {
  SHOTS: 1.0,
  SHOTS_HEARD: 0.9,
  HUNTING: 0.9,
  AGGRESSIVE_ANIMAL: 0.8,
  FIRE: 0.8,
  BLOOD: 0.5,
  DEAD_ANIMAL: 0.4,
  BLOCKED_PATH: 0.3,
  VACCINATION: 0.2,
  ILLEGAL_DUMP: 0.2,
  OTHER: 0.2,
};

/** A report's weight decays linearly to zero over this many days. */
export const RECENCY_WINDOW_DAYS = 30;

/** Sum of weighted reports that saturates the report-density score to 1.0. */
export const REPORT_SATURATION = 3;

/** Fire-hazard degree (0..3) mapped to a 0..1 score. */
export const FIRE_SCORE_BY_DEGREE: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0.2, 2: 0.5, 3: 0.9 };

/** Combination weights for the non-hard-RED case (clamped afterwards). */
export const SCORE_WEIGHTS = { report: 0.7, fire: 0.6 } as const;

/** Level thresholds on the 0..1 combined score. */
export const LEVEL_THRESHOLDS = { green: 0.25, yellow: 0.6 } as const;

export const DEFAULT_RADIUS_METERS = 5000;
export const MAX_RADIUS_METERS = 50000;
