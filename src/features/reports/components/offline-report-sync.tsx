'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { reportsApi } from '@/features/core/report';
import { ApiError } from '@/shared/lib/api/fetch';
import { getTurnstileToken, isTurnstileEnabled } from '@/shared/lib/security/turnstile-client';
import { type QueuedReport, useOfflineReportStore } from '@/shared/store/use-offline-report-store';

async function sendQueued(report: QueuedReport): Promise<'sent' | 'rejected' | 'retry'> {
  // Re-solve Turnstile at replay time (the original submit's token is long expired). If it can't be
  // solved right now, keep the report queued rather than letting the server reject it as a 4xx.
  const turnstileToken = await getTurnstileToken();
  if (isTurnstileEnabled() && !turnstileToken) {
    return 'retry';
  }

  try {
    await reportsApi.create(report.payload, turnstileToken);

    return 'sent';
  } catch (error) {
    if (error instanceof ApiError) {
      // 4xx is permanent (validation / rate limit) - drop it; 5xx is transient - keep and retry.
      return error.status >= 400 && error.status < 500 ? 'rejected' : 'retry';
    }

    return 'retry'; // still offline
  }
}

// Drains the offline report queue when connectivity returns (and on mount / tab focus). Renders
// nothing - it's the background sender for reports created without a connection.
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
          break; // network/transient - leave the rest queued for next time
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
