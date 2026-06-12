import type { ReportType } from '@prisma/client';
import { clamp01 } from '@/shared/lib/math';
import {
  FIRE_SCORE_BY_DEGREE,
  LEVEL_THRESHOLDS,
  RECENCY_WINDOW_DAYS,
  REPORT_SATURATION,
  SCORE_WEIGHTS,
  TYPE_WEIGHTS,
} from './config';
import type { RiskInput, RiskLevel, RiskResult } from './types';

// Pure risk scoring. No I/O, no Date.now() — the caller precomputes report ages, so the same
// input always yields the same output. This is the heart of the app and is unit-tested.

export function typeWeight(type: ReportType): number {
  return TYPE_WEIGHTS[type] ?? TYPE_WEIGHTS.OTHER;
}

/** 1.0 for a brand-new report, decaying linearly to 0 at RECENCY_WINDOW_DAYS. */
export function recencyDecay(ageDays: number): number {
  return clamp01(1 - ageDays / RECENCY_WINDOW_DAYS);
}

/** Combined density of nearby reports as a 0..1 score (weight × recency, then saturated). */
export function reportDensityScore(reports: RiskInput['reports']): number {
  const weightedSum = reports.reduce((total, report) => total + typeWeight(report.type) * recencyDecay(report.ageDays), 0);
  return clamp01(weightedSum / REPORT_SATURATION);
}

export function fireScore(degree: RiskInput['fireDegree']): number {
  return degree === null ? 0 : FIRE_SCORE_BY_DEGREE[degree];
}

function levelFromScore(score01: number): RiskLevel {
  if (score01 < LEVEL_THRESHOLDS.green) {
    return 'GREEN';
  }
  if (score01 < LEVEL_THRESHOLDS.yellow) {
    return 'YELLOW';
  }
  return 'RED';
}

/**
 * Combines signals into a level. Safety rule: an active entry ban or fire-hazard degree III
 * is a hard RED regardless of everything else — we never average those away.
 */
export function assessRisk(input: RiskInput): RiskResult {
  const reportScore = reportDensityScore(input.reports);
  const fScore = fireScore(input.fireDegree);

  const hardRed = input.entryBan || input.fireDegree === 3;
  const score01 = hardRed ? 1 : clamp01(SCORE_WEIGHTS.report * reportScore + SCORE_WEIGHTS.fire * fScore);
  const level = hardRed ? 'RED' : levelFromScore(score01);

  return {
    score: Math.round(score01 * 100),
    level,
    radiusMeters: input.radiusMeters,
    signals: {
      reports: { count: input.reports.length, score: reportScore },
      fire: { degree: input.fireDegree, score: fScore },
      entryBan: { active: input.entryBan },
      inForest: input.inForest,
    },
  };
}
