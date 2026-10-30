'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { reportsApi } from '@/features/core/report';
import { queueOutcomeForStatus } from '@/features/reports/offline-queue';
import { ApiError } from '@/shared/lib/api/fetch';
import { getTurnstileToken, isTurnstileEnabled } from '@/shared/lib/security/turnstile-client';
import { type QueuedReport, useOfflineReportStore } from '@/shared/store/use-offline-report-store';

const RETRY_DELAY_MS = 65_000;

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
      return queueOutcomeForStatus(error instanceof ApiError ? error.status : null);
    }

    return 'retry'; // still offline
  }
}

// Drains the offline report queue when connectivity returns (and on mount / tab focus). Renders
// nothing - it's the background sender for reports created without a connection.
export function OfflineReportSync() {
  const queryClient = useQueryClient();
  const flushing = useRef(false);
  const retryTimer = useRef<number | null>(null);

  const flush = useCallback(async () => {
    if (retryTimer.current !== null) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

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

      if (useOfflineReportStore.getState().pending.length > 0) {
        retryTimer.current = window.setTimeout(flush, RETRY_DELAY_MS);
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
      clearTimeout(retryTimer.current ?? undefined);

      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [flush]);

  return null;
}
