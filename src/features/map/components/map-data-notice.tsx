'use client';

import { TriangleAlert } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { cn } from '@/shared/lib/utils';
import { useOfflineReportStore } from '@/shared/store/use-offline-report-store';

export function MapDataNotice({ visible }: { visible: boolean }) {
  const online = useOnlineStatus();
  const pending = useOfflineReportStore((state) => state.pending.length);
  const offlineIndicatorShown = !online || pending > 0;

  return (
    <div
      role="status"
      className={cn('absolute left-1/2 z-30 w-full max-w-[calc(100%-8rem)] -translate-x-1/2 sm:max-w-md', {
        'bottom-4 sm:bottom-6': !offlineIndicatorShown,
        'bottom-16 sm:bottom-20': offlineIndicatorShown,
      })}
    >
      {visible ? (
        <div className="bg-background/95 flex items-start gap-2 rounded-lg px-3 py-2 text-xs shadow-lg ring-1 ring-amber-500 sm:text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            {online
              ? 'Nie udało się pobrać danych dla tego obszaru. Zakazy wstępu i zgłoszenia mogą być niewidoczne.'
              : 'Brak danych offline dla tego obszaru. Zakazy wstępu i zgłoszenia mogą być niewidoczne.'}
          </span>
        </div>
      ) : null}
    </div>
  );
}
