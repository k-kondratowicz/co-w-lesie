import { describe, expect, it } from 'vitest';
import { assessRisk } from './engine';
import { buildRiskMessage } from './message';
import type { RiskInput } from './types';

const base: RiskInput = { reports: [], fireDegree: null, entryBan: false, inForest: 'OUT', radiusMeters: 5000 };
const known = { fireKnown: true, banKnown: true };

describe('buildRiskMessage', () => {
  it('leads with the entry-ban message when a ban is active', () => {
    const msg = buildRiskMessage(assessRisk({ ...base, entryBan: true }), known);
    expect(msg).toMatch(/zakaz wstępu/i);
  });

  it('calls out extreme fire hazard at degree III', () => {
    const msg = buildRiskMessage(assessRisk({ ...base, fireDegree: 3 }), known);
    expect(msg).toMatch(/III stopień/);
  });

  it('GREEN includes the Lasy Państwowe disclaimer and never claims safety', () => {
    const msg = buildRiskMessage(assessRisk(base), known);
    expect(msg).toMatch(/Lasów Państwowych/);
    expect(msg).not.toMatch(/bezpiecznie/i);
  });

  it('acknowledges nearby reports even when the level is GREEN', () => {
    // One BLOOD report → low aggregate (GREEN), but the message must not say "no hazards".
    const msg = buildRiskMessage(assessRisk({ ...base, reports: [{ type: 'BLOOD', ageDays: 0 }] }), known);
    expect(msg).toMatch(/W pobliżu odnotowano 1 zgłoszenie/);
    expect(msg).not.toMatch(/Brak znanych zagrożeń/);
  });

  it('stays cautious instead of GREEN when signals are unknown', () => {
    const msg = buildRiskMessage(assessRisk(base), { fireKnown: false, banKnown: false });
    expect(msg).toMatch(/Nie udało się potwierdzić/);
  });

  it('uses correct Polish plural for report counts', () => {
    // fireDegree 1 nudges these into YELLOW so the count template (not the GREEN line) is used.
    const one = buildRiskMessage(assessRisk({ ...base, fireDegree: 1, reports: [{ type: 'SHOTS_HEARD', ageDays: 1 }] }), known);
    const few = buildRiskMessage(
      assessRisk({ ...base, reports: Array.from({ length: 2 }, () => ({ type: 'HUNTING' as const, ageDays: 1 })) }),
      known,
    );
    expect(one).toMatch(/1 zgłoszenie /);
    expect(few).toMatch(/2 zgłoszenia /);
  });
});
