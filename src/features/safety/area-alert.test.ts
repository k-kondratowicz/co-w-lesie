import { describe, expect, it } from 'vitest';
import type { RiskResult } from '@/features/core/risk';
import { activeHazards, buildAreaAlert, newHazards, signatureOf } from './area-alert';

function signals(overrides: Partial<RiskResult['signals']>): Pick<RiskResult, 'signals'> {
  return {
    signals: {
      reports: { count: 0, score: 0 },
      fire: { degree: null, score: 0 },
      entryBan: { active: false },
      inForest: 'IN',
      ...overrides,
    },
  };
}

describe('activeHazards', () => {
  it('reports a ban and fire degree III as hazards', () => {
    expect(activeHazards(signals({ entryBan: { active: true }, fire: { degree: 3, score: 100 } }))).toEqual(['ban', 'fire:3']);
  });

  it('ignores fire below degree III', () => {
    expect(activeHazards(signals({ fire: { degree: 2, score: 50 } }))).toEqual([]);
  });

  it('treats unknown fire degree as no hazard', () => {
    expect(activeHazards(signals({ fire: { degree: null, score: 0 } }))).toEqual([]);
  });
});

describe('signatureOf', () => {
  it('is null with no hazards', () => {
    expect(signatureOf([])).toBeNull();
  });

  it('is order-independent', () => {
    expect(signatureOf(['fire:3', 'ban'])).toBe(signatureOf(['ban', 'fire:3']));
  });
});

describe('newHazards (onset-only)', () => {
  it('alerts the first time a hazard appears', () => {
    expect(newHazards(null, ['ban'])).toEqual(['ban']);
  });

  it('does not re-alert a standing hazard', () => {
    expect(newHazards('ban', ['ban'])).toEqual([]);
  });

  it('alerts a fire III appearing on top of an existing ban', () => {
    expect(newHazards('ban', ['ban', 'fire:3'])).toEqual(['fire:3']);
  });

  it('never reports an all-clear when a hazard lifts', () => {
    expect(newHazards('ban', [])).toEqual([]);
  });
});

describe('buildAreaAlert', () => {
  it('is null with no hazards', () => {
    expect(buildAreaAlert('Puszcza Niepolomicka', [])).toBeNull();
  });

  it('never implies safety and names the area', () => {
    const alert = buildAreaAlert('Puszcza Niepolomicka', ['ban', 'fire:3']);

    expect(alert?.title).toContain('Puszcza Niepolomicka');
    expect(alert?.body).toContain('zakaz wstępu');
    expect(alert?.body).toContain('III stopień');
    expect(alert?.body).toContain('Odradzamy');
  });
});
