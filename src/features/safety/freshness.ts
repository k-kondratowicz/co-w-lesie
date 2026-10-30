import type { RiskAssessment } from '@/features/core/risk';

export type FreshnessLine = { label: string; asOf: string | null; stale: boolean };

/** Fire and bans can turn the result RED, so they are shown up front; the rest is background. */
export function freshnessLines(assessment: RiskAssessment): { critical: FreshnessLine[]; other: NonNullable<FreshnessLine>[] } {
  return {
    critical: [
      { label: 'Zagrożenie pożarowe', asOf: assessment.fireAsOf, stale: assessment.signals.fire.state === 'STALE' },
      { label: 'Zakazy wstępu', asOf: assessment.bansAsOf, stale: assessment.signals.entryBan.state === 'STALE' },
    ],
    other: [
      { label: 'Zgłoszenia policyjne (KMZB)', asOf: assessment.kmzbAsOf, stale: false },
      { label: 'Szczepienia lisów', asOf: assessment.vaccinationAsOf, stale: false },
    ].filter((line) => line.asOf !== null),
  };
}
