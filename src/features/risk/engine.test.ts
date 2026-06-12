import { describe, expect, it } from 'vitest';
import { assessRisk, recencyDecay, reportDensityScore, typeWeight } from './engine';
import type { RiskInput } from './types';

const base: RiskInput = { reports: [], fireDegree: null, entryBan: false, inForest: 'OUT', radiusMeters: 5000 };

describe('typeWeight', () => {
  it('ranks gunfire above littering', () => {
    expect(typeWeight('SHOTS')).toBeGreaterThan(typeWeight('ILLEGAL_DUMP'));
  });
});

describe('recencyDecay', () => {
  it('is 1 for a fresh report and 0 at/after the window', () => {
    expect(recencyDecay(0)).toBe(1);
    expect(recencyDecay(15)).toBeCloseTo(0.5);
    expect(recencyDecay(30)).toBe(0);
    expect(recencyDecay(60)).toBe(0);
  });
});

describe('reportDensityScore', () => {
  it('is 0 with no reports', () => {
    expect(reportDensityScore([])).toBe(0);
  });

  it('saturates to 1 with enough fresh high-weight reports', () => {
    const many = Array.from({ length: 5 }, () => ({ type: 'SHOTS' as const, ageDays: 0 }));
    expect(reportDensityScore(many)).toBe(1);
  });

  it('weights old reports less than fresh ones', () => {
    const fresh = reportDensityScore([{ type: 'SHOTS', ageDays: 0 }]);
    const old = reportDensityScore([{ type: 'SHOTS', ageDays: 25 }]);
    expect(fresh).toBeGreaterThan(old);
  });
});

describe('assessRisk', () => {
  it('is GREEN with no signals', () => {
    const r = assessRisk(base);
    expect(r.level).toBe('GREEN');
    expect(r.score).toBe(0);
  });

  it('forces RED on an active entry ban regardless of other signals', () => {
    const r = assessRisk({ ...base, entryBan: true });
    expect(r.level).toBe('RED');
    expect(r.score).toBe(100);
  });

  it('forces RED on fire-hazard degree III', () => {
    const r = assessRisk({ ...base, fireDegree: 3 });
    expect(r.level).toBe('RED');
  });

  it('is YELLOW for a moderate cluster of recent reports', () => {
    const reports = [
      { type: 'SHOTS_HEARD' as const, ageDays: 1 },
      { type: 'HUNTING' as const, ageDays: 2 },
    ];
    const r = assessRisk({ ...base, reports });
    expect(r.level).toBe('YELLOW');
  });

  it('reports the signal breakdown', () => {
    const r = assessRisk({ ...base, fireDegree: 2, reports: [{ type: 'BLOOD', ageDays: 0 }] });
    expect(r.signals.fire.degree).toBe(2);
    expect(r.signals.reports.count).toBe(1);
    expect(r.signals.entryBan.active).toBe(false);
  });
});
