import type { ReportType } from '@/features/core/report';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  BLOOD: 'Krew',
  FIRE: 'Pożar',
  HUNTING: 'Polowanie',
  SHOTS: 'Strzały',
  SHOTS_HEARD: 'Słychać strzały',
  VACCINATION: 'Szczepienie zwierząt',
  DEAD_ANIMAL: 'Martwe zwierzę',
  AGGRESSIVE_ANIMAL: 'Agresywne zwierzę',
  BLOCKED_PATH: 'Zablokowana droga',
  ILLEGAL_DUMP: 'Dzikie wysypisko',
  OTHER: 'Inne',
};

/** Label for a report type, falling back to the raw value if unknown. */
export function reportTypeLabel(type: string): string {
  return REPORT_TYPE_LABELS[type as ReportType] ?? type;
}
