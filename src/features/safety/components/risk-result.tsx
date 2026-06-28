import { CloudOff } from 'lucide-react';
import type { RiskAssessment } from '@/features/core/risk';
import { fireDegreeRoman, RISK_LEVEL_PRESENTATION } from '@/features/core/risk';
import { formatDate, formatDateTime } from '@/shared/lib/date/format-date';
import { formatRelativeTime } from '@/shared/lib/date/format-relative-time';
import { formatDistance } from '@/shared/lib/geo/format-distance';

function fireLabel(degree: 0 | 1 | 2 | 3 | null): string {
  if (degree === null) {
    return 'Brak danych';
  }
  if (degree === 0) {
    return 'Brak';
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

const KMZB_ADVISORY_LABELS = { poaching: 'kłusownictwo', grassBurning: 'wypalanie traw' } as const;

function kmzbAdvisoryItems(advisory: RiskAssessment['kmzbAdvisory']): string[] {
  return (Object.keys(KMZB_ADVISORY_LABELS) as (keyof typeof KMZB_ADVISORY_LABELS)[])
    .filter((key) => advisory[key] > 0)
    .map((key) => `${KMZB_ADVISORY_LABELS[key]} (${advisory[key]})`);
}

export function RiskResult({
  assessment,
  isOffline = false,
  lastUpdatedAt,
}: {
  assessment: RiskAssessment;
  isOffline?: boolean;
  lastUpdatedAt?: number;
}) {
  const {
    level,
    message,
    signals,
    fireAsOf,
    bansAsOf,
    kmzbAsOf,
    vaccinationAsOf,
    ban,
    nearbyBans,
    kmzbAdvisory,
    vaccinationAdvisory,
  } = assessment;
  const style = RISK_LEVEL_PRESENTATION[level];
  const fireUpdatedAt = fireAsOf ? formatDateTime(fireAsOf) : null;
  const bansUpdatedAt = bansAsOf ? formatDateTime(bansAsOf) : null;
  const kmzbUpdatedAt = kmzbAsOf ? formatDateTime(kmzbAsOf) : null;
  const vaccinationUpdatedAt = vaccinationAsOf ? formatDateTime(vaccinationAsOf) : null;
  const banUntil = ban?.until ? formatDate(ban.until) : null;
  const kmzbItems = kmzbAdvisoryItems(kmzbAdvisory);
  const vaccinationWindow =
    vaccinationAdvisory.active && vaccinationAdvisory.startDate && vaccinationAdvisory.endDate
      ? `${formatDate(vaccinationAdvisory.startDate)} - ${formatDate(vaccinationAdvisory.endDate)}`
      : null;

  return (
    <div className="space-y-4">
      {isOffline ? (
        <div className="flex items-start gap-2 rounded-lg bg-amber-100 p-3 text-amber-900 text-sm dark:bg-amber-950 dark:text-amber-200">
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Jesteś offline - to ostatnia zapamiętana ocena
            {lastUpdatedAt ? ` (pobrana ${formatRelativeTime(lastUpdatedAt)})` : ''}. Warunki mogły się zmienić - zachowaj
            ostrożność.
          </p>
        </div>
      ) : null}

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

      {ban ? (
        <div className="space-y-1 rounded-lg bg-red-50 p-3 text-red-800 text-sm dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Obowiązuje zakaz wstępu do lasu</p>
          <p>Powód: {ban.reason ?? 'nie podano'}</p>
          {banUntil ? <p>Obowiązuje do: {banUntil}</p> : null}
        </div>
      ) : null}

      {nearbyBans.count > 0 ? (
        <div className="rounded-lg bg-amber-50 p-3 text-amber-800 text-sm dark:bg-amber-950 dark:text-amber-200">
          W pobliżu obowiązują zakazy wstępu do lasu
          {nearbyBans.nearestMeters !== null ? ` (najbliższy ~${formatDistance(nearbyBans.nearestMeters)})` : ''}. Sprawdź
          czerwone obszary na mapie.
        </div>
      ) : null}

      {kmzbItems.length > 0 ? (
        <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-amber-800 text-sm dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Zgłoszenia policyjne w okolicy (ostatni tydzień)</p>
          <p>W pobliżu odnotowano: {kmzbItems.join(', ')}. Zachowaj ostrożność.</p>
          <p>
            Jeśli zauważysz oznaki kłusownictwa lub wypalania traw, zgłoś to policji (tel. 112). Źródło: KMZB (Policja) via
            geoportal.gov.pl.
          </p>
        </div>
      ) : null}

      {vaccinationAdvisory.active ? (
        <div className="space-y-1 rounded-lg bg-amber-50 p-3 text-amber-800 text-sm dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Akcja szczepienia lisów przeciw wściekliźnie</p>
          <p>
            W województwie {vaccinationAdvisory.voivodeship} trwa wykładanie przynęt ze szczepionką
            {vaccinationWindow ? ` (akcja: ${vaccinationWindow})` : ''}. Nie dotykaj znalezionych przynęt i trzymaj psa na smyczy.
          </p>
          <p>Źródło: lisy.info (Aeroklub Ziemi Lubuskiej / GIW).</p>
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {fireUpdatedAt ? `Zagrożenie pożarowe - dane z: ${fireUpdatedAt}. ` : ''}
        {bansUpdatedAt ? `Zakazy wstępu - dane z: ${bansUpdatedAt}. ` : ''}
        {kmzbUpdatedAt ? `Zgłoszenia policyjne (KMZB) - dane z: ${kmzbUpdatedAt}. ` : ''}
        {vaccinationUpdatedAt ? `Szczepienia lisów - dane z: ${vaccinationUpdatedAt}. ` : ''}
        {!fireUpdatedAt && !bansUpdatedAt ? 'Aktualność danych nieznana - zachowaj ostrożność. ' : ''}
        To ocena pomocnicza i nie zastępuje komunikatów Lasów Państwowych.
      </p>
    </div>
  );
}
