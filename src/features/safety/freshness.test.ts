import { describe, expect, it } from 'vitest';
import type { RiskAssessment } from '@/features/core/risk';
import { freshnessLines } from './freshness';

type FixtureOverrides = {
  fireAsOf?: string | null;
  bansAsOf?: string | null;
  kmzbAsOf?: string | null;
  vaccinationAsOf?: string | null;
  fireState?: string;
  banState?: string;
};

// Only the fields freshnessLines reads; the cast keeps the rest of RiskAssessment out of the test.
function assessmentFixture(overrides: FixtureOverrides = {}): RiskAssessment {
  return {
    fireAsOf: '2026-10-30T08:00:00Z',
    bansAsOf: '2026-10-30T07:00:00Z',
    kmzbAsOf: '2026-10-29T12:00:00Z',
    vaccinationAsOf: '2026-10-01T00:00:00Z',
    ...overrides,
    signals: {
      fire: { state: overrides.fireState ?? 'OK' },
      entryBan: { state: overrides.banState ?? 'OK' },
    },
  } as unknown as RiskAssessment;
}

describe('freshnessLines', () => {
  it('marks fire data stale when its signal is STALE', () => {
    const { critical } = freshnessLines(assessmentFixture({ fireState: 'STALE' }));

    expect(critical[0]).toMatchObject({ label: 'Zagrożenie pożarowe', stale: true });
    expect(critical[1].stale).toBe(false);
  });

  it('marks bans stale independently of fire', () => {
    const { critical } = freshnessLines(assessmentFixture({ banState: 'STALE' }));

    expect(critical.map((line) => line.stale)).toEqual([false, true]);
  });

  it('always lists fire first, then bans, even without data', () => {
    const { critical } = freshnessLines(assessmentFixture({ fireAsOf: null, bansAsOf: null }));

    expect(critical.map((line) => line.label)).toEqual(['Zagrożenie pożarowe', 'Zakazy wstępu']);
    expect(critical.map((line) => line.asOf)).toEqual([null, null]);
  });

  it('leaves out background sources with no timestamp', () => {
    const { other } = freshnessLines(assessmentFixture({ kmzbAsOf: null }));

    expect(other.map((line) => line.label)).toEqual(['Szczepienia lisów']);
  });

  it('never marks background sources stale', () => {
    const { other } = freshnessLines(assessmentFixture());

    expect(other).toHaveLength(2);
    expect(other.every((line) => !line.stale)).toBe(true);
  });
});
