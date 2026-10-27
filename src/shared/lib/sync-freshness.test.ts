import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS } from '@/shared/lib/date/time';
import { evaluateSyncFreshness, isFireForecastOutdated, WATCHDOG_STALE_THRESHOLD_MS } from './sync-freshness';

const NOW = new Date('2026-06-23T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe('evaluateSyncFreshness', () => {
  it('marks fresh datasets as not stale', () => {
    const result = evaluateSyncFreshness(
      [
        { dataset: 'fire', syncedAt: ago(2 * HOUR_MS) },
        { dataset: 'bans', syncedAt: ago(6 * HOUR_MS) },
      ],
      NOW,
    );

    expect(result.datasets.fire.stale).toBe(false);
    expect(result.datasets.bans.stale).toBe(false);
    expect(result.criticalStale).toBe(false);
  });

  it('flags a critical dataset past its threshold and sets criticalStale', () => {
    const result = evaluateSyncFreshness(
      [
        { dataset: 'fire', syncedAt: ago(20 * HOUR_MS) },
        { dataset: 'bans', syncedAt: ago(6 * HOUR_MS) },
      ],
      NOW,
    );

    expect(result.datasets.fire.stale).toBe(true);
    expect(result.criticalStale).toBe(true);
  });

  // 14h is the normal overnight gap of the 06-16 UTC fire sync - fine for users, dead for the watchdog.
  it('keeps fire fresh for users across the overnight gap while the watchdog flags it', () => {
    const rows = [
      { dataset: 'fire', syncedAt: ago(14 * HOUR_MS) },
      { dataset: 'bans', syncedAt: ago(6 * HOUR_MS) },
    ];

    expect(evaluateSyncFreshness(rows, NOW).datasets.fire.stale).toBe(false);
    expect(evaluateSyncFreshness(rows, NOW, WATCHDOG_STALE_THRESHOLD_MS).datasets.fire.stale).toBe(true);
  });

  it('applies the same bans threshold for users and the watchdog', () => {
    const rows = [
      { dataset: 'fire', syncedAt: ago(1 * HOUR_MS) },
      { dataset: 'bans', syncedAt: ago(3 * DAY_MS) },
    ];

    expect(evaluateSyncFreshness(rows, NOW).datasets.bans.stale).toBe(true);
    expect(evaluateSyncFreshness(rows, NOW, WATCHDOG_STALE_THRESHOLD_MS).datasets.bans.stale).toBe(true);
  });

  it('treats a never-synced critical dataset as stale (missing is not fresh)', () => {
    const result = evaluateSyncFreshness([{ dataset: 'bans', syncedAt: ago(1 * HOUR_MS) }], NOW);

    expect(result.datasets.fire).toMatchObject({ syncedAt: null, ageMs: null, stale: true });
    expect(result.criticalStale).toBe(true);
  });

  it('a stale kmzb (non-critical) does not trip criticalStale', () => {
    const result = evaluateSyncFreshness(
      [
        { dataset: 'fire', syncedAt: ago(1 * HOUR_MS) },
        { dataset: 'bans', syncedAt: ago(1 * HOUR_MS) },
        { dataset: 'kmzb', syncedAt: ago(5 * DAY_MS) },
      ],
      NOW,
    );

    expect(result.datasets.kmzb.stale).toBe(true);
    expect(result.criticalStale).toBe(false);
  });
});

describe('isFireForecastOutdated', () => {
  it('keeps the afternoon forecast current through the next morning', () => {
    expect(isFireForecastOutdated(ago(20 * HOUR_MS), NOW)).toBe(false);
  });

  it('flags a forecast older than a day, even when the sync itself is fresh', () => {
    expect(isFireForecastOutdated(ago(25 * HOUR_MS), NOW)).toBe(true);
    expect(isFireForecastOutdated(ago(2 * DAY_MS), NOW)).toBe(true);
  });

  it('treats no forecast as missing, not outdated', () => {
    expect(isFireForecastOutdated(null, NOW)).toBe(false);
  });
});
