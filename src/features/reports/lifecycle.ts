import type { ReportType } from '@prisma/client';
import { clamp01 } from '@/shared/lib/math';
import { HOUR_MS } from '@/shared/lib/time';

// How long a report stays relevant, by type (hours). Time-critical events fade fast; physical,
// persistent situations linger. A confirmation pushes the expiry out again (see the vote route).
const TTL_HOURS: Record<ReportType, number> = {
  FIRE: 24,
  SHOTS: 24,
  SHOTS_HEARD: 24,
  HUNTING: 24,
  BLOOD: 48,
  AGGRESSIVE_ANIMAL: 48,
  VACCINATION: 72,
  DEAD_ANIMAL: 168, // 7 days
  BLOCKED_PATH: 336, // 14 days
  ILLEGAL_DUMP: 720, // 30 days
  OTHER: 72,
};

// Hidden once flags outweigh confirmations by this much - the crowd marking it gone/wrong.
export const FLAG_DISPUTE_THRESHOLD = 2;

export function reportTtlMs(type: ReportType): number {
  return TTL_HOURS[type] * HOUR_MS;
}

export function expiryFrom(type: ReportType, from: Date = new Date()): Date {
  return new Date(from.getTime() + reportTtlMs(type));
}

// Maps how far a report is through its lifetime to a map opacity (fresh → faded). Computed
// server-side because MapLibre paint expressions can't read the current time. `lastActivity`
// is the last confirmation (or creation), so confirming a report visually refreshes it.
export function ageOpacity(type: ReportType, lastActivity: Date, now: Date = new Date()): number {
  const fraction = clamp01((now.getTime() - lastActivity.getTime()) / reportTtlMs(type));

  return Number((1 - 0.65 * fraction).toFixed(2)); // 1.0 (fresh) → 0.35 (near expiry)
}
