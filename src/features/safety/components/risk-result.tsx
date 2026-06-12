import { fireDegreeRoman } from '@/features/risk/format';
import type { RiskAssessment } from '@/features/safety/types';

const LEVEL_STYLES = {
  GREEN: {
    box: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Niskie ryzyko',
  },
  YELLOW: {
    box: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    dot: 'bg-amber-500',
    label: 'Zachowaj ostrożność',
  },
  RED: { box: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200', dot: 'bg-red-500', label: 'Odradzamy wyjście do lasu' },
} as const;

function fireLabel(degree: 0 | 1 | 2 | 3 | null): string {
  if (degree === null) {
    return 'Brak danych';
  }
  if (degree === 0) {
    return 'Brak zagrożenia';
  }
  return `Stopień ${fireDegreeRoman(degree)}`;
}

const IN_FOREST_LABEL = { IN: 'Tak', OUT: 'Nie', UNKNOWN: 'Nie wiadomo' } as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-border/60 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function RiskResult({ assessment }: { assessment: RiskAssessment }) {
  const { level, message, signals, dataAsOf } = assessment;
  const style = LEVEL_STYLES[level];
  const updatedAt = dataAsOf ? new Date(dataAsOf).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }) : null;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-lg p-4 ${style.box}`}>
        <span className={`size-3 shrink-0 rounded-full ${style.dot}`} aria-hidden />
        <p className="font-semibold">{style.label}</p>
      </div>

      <p className="text-sm">{message}</p>

      <div className="rounded-lg border border-border/60 px-3">
        <Row label="Zgłoszenia w pobliżu" value={String(signals.reports.count)} />
        <Row label="Zagrożenie pożarowe" value={fireLabel(signals.fire.degree)} />
        <Row label="Zakaz wstępu" value={signals.entryBan.active ? 'Tak' : 'Nie'} />
        <Row label="W lesie" value={IN_FOREST_LABEL[signals.inForest]} />
      </div>

      <p className="text-muted-foreground text-xs">
        {updatedAt ? `Dane o zagrożeniach z: ${updatedAt}. ` : 'Aktualność danych nieznana — zachowaj ostrożność. '}
        To ocena pomocnicza i nie zastępuje komunikatów Lasów Państwowych.
      </p>
    </div>
  );
}
