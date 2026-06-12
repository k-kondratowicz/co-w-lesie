import { ReportType } from '@prisma/client';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.BLOOD]: 'Krew',
  [ReportType.FIRE]: 'Pożar',
  [ReportType.HUNTING]: 'Polowanie',
  [ReportType.SHOTS]: 'Strzały',
  [ReportType.SHOTS_HEARD]: 'Słychać strzały',
  [ReportType.VACCINATION]: 'Szczepienie zwierząt',
  [ReportType.DEAD_ANIMAL]: 'Martwe zwierzę',
  [ReportType.AGGRESSIVE_ANIMAL]: 'Agresywne zwierzę',
  [ReportType.BLOCKED_PATH]: 'Zablokowana droga',
  [ReportType.ILLEGAL_DUMP]: 'Dzikie wysypisko',
  [ReportType.OTHER]: 'Inne',
};

/** Label for a report type, falling back to the raw value if unknown. */
export function reportTypeLabel(type: string): string {
  return REPORT_TYPE_LABELS[type as ReportType] ?? type;
}
