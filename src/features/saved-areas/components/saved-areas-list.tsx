import { Trash2 } from 'lucide-react';
import { RISK_LEVEL_PRESENTATION } from '@/features/core/risk';
import { useSavedAreaStatuses } from '@/features/saved-areas/hooks/use-saved-area-statuses';
import type { SavedArea } from '@/features/saved-areas/types';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import { formatRelativeTime } from '@/shared/lib/date/format-relative-time';

// No cached result (never opened, or offline before first fetch) is UNKNOWN, never a reassuring
// colour - the safety rule: missing data is not "safe". A known level reuses the shared
// presentation so the dot and wording match the area's full assessment exactly.
const UNKNOWN_STATUS = { dot: 'bg-muted-foreground/40', label: 'Brak danych - zachowaj ostrożność' };

function areaLabel(area: SavedArea): string {
  return area.name?.trim() || `${area.lat.toFixed(3)}, ${area.lng.toFixed(3)}`;
}

export function SavedAreasList({ onSelect, emptyMessage }: { onSelect: (area: SavedArea) => void; emptyMessage?: string }) {
  const { areas, isLoading, isError, remove, statusFor } = useSavedAreaStatuses();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner /> Wczytuję zapisane obszary...
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive text-sm">Nie udało się wczytać zapisanych obszarów.</p>;
  }

  if (areas.length === 0) {
    return emptyMessage ? <p className="text-muted-foreground text-sm">{emptyMessage}</p> : null;
  }

  return (
    <ul className="space-y-1">
      {areas.map((area) => {
        const { level, updatedAt } = statusFor(area);
        const status = level ? RISK_LEVEL_PRESENTATION[level] : UNKNOWN_STATUS;
        const freshness = updatedAt ? formatRelativeTime(updatedAt) : 'brak danych';

        return (
          <li key={area.id} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-auto flex-1 justify-start gap-2 py-1.5"
              onClick={() => onSelect(area)}
              title={`${status.label} (promień ${(area.radiusMeters / 1000).toFixed(1)} km)`}
            >
              <span className={`size-2.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate">{areaLabel(area)}</span>
                <span className="text-muted-foreground text-xs">
                  {status.label} · {freshness}
                </span>
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Usuń obszar ${areaLabel(area)}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(area.id)}
            >
              <Trash2 />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
