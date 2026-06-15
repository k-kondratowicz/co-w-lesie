'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { type QueuedReport, useOfflineReportStore } from '@/shared/store/use-offline-report-store';

async function sendQueued(report: QueuedReport): Promise<'sent' | 'rejected' | 'retry'> {
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report.payload),
    });

    if (res.ok) {
      return 'sent';
    }

    // 4xx is permanent (validation / rate limit) — drop it; 5xx is transient — keep and retry.
    return res.status >= 400 && res.status < 500 ? 'rejected' : 'retry';
  } catch {
    return 'retry'; // still offline
  }
}

// Drains the offline report queue when connectivity returns (and on mount / tab focus). Renders
// nothing — it's the background sender for reports created without a connection.
export function OfflineReportSync() {
  const queryClient = useQueryClient();
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current || useOfflineReportStore.getState().pending.length === 0) {
      return;
    }

    flushing.current = true;
    let sent = 0;
    let rejected = 0;

    try {
      for (const report of useOfflineReportStore.getState().pending) {
        const outcome = await sendQueued(report);
        if (outcome === 'retry') {
          break; // network/transient — leave the rest queued for next time
        }

        useOfflineReportStore.getState().remove(report.id);
        if (outcome === 'sent') {
          sent += 1;
        } else {
          rejected += 1;
        }
      }
    } finally {
      flushing.current = false;
    }

    if (sent > 0) {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(sent === 1 ? 'Wysłano zaległe zgłoszenie.' : `Wysłano zaległe zgłoszenia (${sent}).`);
    }

    if (rejected > 0) {
      toast.error('Nie udało się wysłać niektórych zaległych zgłoszeń.');
    }
  }, [queryClient]);

  useEffect(() => {
    flush();

    const onOnline = () => flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        flush();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [flush]);

  return null;
}
