import type { RiskResult } from '@/features/risk/types';

// Only the two RED triggers notify (survey: people want to be warned, not nagged). Fire alerts
// fire ONLY at degree III - lower degrees are routine and would train users to ignore the app.
export type AreaHazard = 'ban' | 'fire:3';

type HazardSignals = Pick<RiskResult, 'signals'>;

export function activeHazards({ signals }: HazardSignals): AreaHazard[] {
  const hazards: AreaHazard[] = [];

  if (signals.entryBan.active) {
    hazards.push('ban');
  }

  if (signals.fire.degree === 3) {
    hazards.push('fire:3');
  }

  return hazards;
}

// Stable string for the SavedArea.lastAlertSignature column. Sorted so token order never produces
// a spurious "changed" signature. Empty hazard set is null - no standing hazard to remember.
export function signatureOf(hazards: AreaHazard[]): string | null {
  if (hazards.length === 0) {
    return null;
  }

  return [...hazards].sort().join('|');
}

function parseSignature(signature: string | null): AreaHazard[] {
  if (!signature) {
    return [];
  }

  return signature.split('|') as AreaHazard[];
}

// Onset-only: a hazard counts as new only if it was not present at the last alert. A standing ban
// never re-alerts; a fire III appearing on top of an existing ban does. We never report an
// all-clear here - the safety rule forbids any push that could read as "now safe".
export function newHazards(previousSignature: string | null, current: AreaHazard[]): AreaHazard[] {
  const previous = new Set(parseSignature(previousSignature));

  return current.filter((hazard) => !previous.has(hazard));
}

const HAZARD_COPY: Record<AreaHazard, string> = {
  ban: 'pojawił się zakaz wstępu do lasu',
  'fire:3': 'III stopień zagrożenia pożarowego',
};

export type AreaAlert = { title: string; body: string };

export function buildAreaAlert(areaLabel: string, hazards: AreaHazard[]): AreaAlert | null {
  if (hazards.length === 0) {
    return null;
  }

  const reasons = hazards.map((hazard) => HAZARD_COPY[hazard]).join(' oraz ');

  return {
    title: `Uwaga: ${areaLabel}`,
    body: `${reasons}. Odradzamy wyjście do lasu - sprawdź szczegóły i komunikaty LP.`,
  };
}
