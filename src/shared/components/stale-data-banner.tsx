'use client';

import { useQuery } from '@tanstack/react-query';
import { TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@/shared/components/ui';
import { get } from '@/shared/lib/api/fetch';
import { formatRelativeTime } from '@/shared/lib/date/format-relative-time';
import type { SyncFreshness } from '@/shared/lib/sync-freshness';

// The freshest timestamp among the stale critical datasets - "last updated X" for the warning.
function lastCriticalUpdate(freshness: SyncFreshness): string | null {
  const stamps = ['fire', 'bans']
    .map((dataset) => freshness.datasets[dataset]?.syncedAt)
    .filter((value): value is string => Boolean(value));

  if (stamps.length === 0) {
    return null;
  }

  return stamps.reduce((newest, current) => (current > newest ? current : newest));
}

// Loud, app-wide warning when the safety-critical signals (fire hazard, entry bans) have gone
// stale - so a dead sync never lets the assistant quietly imply "no known hazards" on old data.
export function StaleDataBanner() {
  const [dissmissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => get<SyncFreshness>('/api/sync-status'),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  if (!data?.criticalStale) {
    return null;
  }

  if (dissmissed) {
    return null;
  }

  const updatedAt = lastCriticalUpdate(data);

  return (
    <Alert
      variant="destructive"
      className="absolute! pointer-events-auto top-20 left-1/2 z-30 w-[min(92%,32rem)] -translate-x-1/2"
    >
      <TriangleAlert />
      <AlertTitle>Dane mogą być nieaktualne</AlertTitle>
      <AlertDescription>
        Dane o zagrożeniu pożarowym i zakazach wstępu mogą być nieaktualne
        {updatedAt ? ` (ostatnia aktualizacja ${formatRelativeTime(updatedAt)})` : ''}. Zachowaj szczególną ostrożność i sprawdź
        komunikaty Lasów Państwowych.
      </AlertDescription>
      <AlertAction>
        <Button size="icon-sm" variant="destructive" onClick={() => setDismissed(true)}>
          <X />
          <span className="sr-only">Zamknij</span>
        </Button>
      </AlertAction>
    </Alert>
  );
}
