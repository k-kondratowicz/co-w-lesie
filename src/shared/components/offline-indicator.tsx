'use client';

import { CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { useOfflineReportStore } from '@/shared/store/use-offline-report-store';

// Small pill shown when offline or while queued reports are still waiting to send.
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const pending = useOfflineReportStore((state) => state.pending.length);

  if (online && pending === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500/95 px-3 py-1.5 text-white text-xs shadow-lg sm:bottom-8 sm:text-sm">
      <CloudOff className="size-4" />
      <span>{online ? 'Wysyłanie zgłoszeń...' : 'Tryb offline'}</span>
      {pending > 0 ? <span className="font-medium">· {pending} w kolejce</span> : null}
    </div>
  );
}
