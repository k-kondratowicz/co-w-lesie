import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS } from '@/shared/lib/date/time';
import { evaluateSyncFreshness } from './sync-freshness';

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
        { dataset: 'fire', syncedAt: ago(8 * HOUR_MS) },
        { dataset: 'bans', syncedAt: ago(6 * HOUR_MS) },
      ],
      NOW,
    );

    expect(result.datasets.fire.stale).toBe(true);
    expect(result.criticalStale).toBe(true);
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
