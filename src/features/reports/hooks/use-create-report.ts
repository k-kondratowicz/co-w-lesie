'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type CreateReportInput, reportsApi } from '@/features/core/report';
import { uploadReportPhoto } from '@/features/reports/upload-photo';
import { ApiError } from '@/shared/lib/api/fetch';
import { isTurnstileEnabled } from '@/shared/lib/security/turnstile-client';
import { useOfflineReportStore } from '@/shared/store/use-offline-report-store';
import { useTurnstileStore } from '@/shared/store/use-turnstile-store';

export type CreateReportValues = CreateReportInput & { photo?: File | null };
type CreateReportResult = { queued: true } | { queued: false; id: string };

async function createReport(input: CreateReportInput, turnstileToken: string | null): Promise<CreateReportResult> {
  try {
    const { id } = await reportsApi.create(input, turnstileToken);

    return { queued: false, id };
  } catch (error) {
    // Network failure (offline): queue it. GPS coordinates captured offline are still valid,
    // so the report is sent - and validated - once connectivity returns.
    if (!(error instanceof ApiError)) {
      useOfflineReportStore.getState().enqueue(input);

      return { queued: true };
    }

    throw error;
  }
}

/** Uploads the photo, sends the report (or queues it offline) and reports the outcome as a toast. */
export function useCreateReport({ onSendFailed }: { onSendFailed: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ input, turnstileToken }: { input: CreateReportInput; turnstileToken: string | null }) =>
      createReport(input, turnstileToken),
    // Run even when offline so createReport can catch the failure and queue the report
    // (default 'online' would pause the mutation instead of calling it).
    networkMode: 'always',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const submit = async ({ photo, ...report }: CreateReportValues): Promise<boolean> => {
    let imageKey: string | undefined;

    // Upload the photo first (online only - the presigned PUT needs a connection). Offline
    // reports are queued without a photo.
    if (photo) {
      if (navigator.onLine) {
        try {
          imageKey = await uploadReportPhoto(photo);
        } catch {
          toast.error('Nie udało się przesłać zdjęcia. Spróbuj ponownie.');
          return false;
        }
      } else {
        toast.info('Brak internetu - zgłoszenie zapiszemy bez zdjęcia.');
      }
    }

    // Token comes from the inline widget (in the dialog, so a challenge stays clickable). Offline
    // reports queue without one and re-solve on replay.
    const turnstileToken = useTurnstileStore.getState().token;
    if (navigator.onLine && isTurnstileEnabled() && !turnstileToken) {
      toast.error('Potwierdź, że nie jesteś robotem, i spróbuj ponownie.');
      return false;
    }

    try {
      const result = await mutation.mutateAsync({ input: { ...report, imageKey }, turnstileToken });
      toast.success(
        result.queued
          ? 'Brak internetu - zgłoszenie wyślemy automatycznie, gdy wróci połączenie.'
          : 'Dziękujemy! Zgłoszenie zostało dodane.',
      );

      return true;
    } catch (err) {
      onSendFailed();
      toast.error(err instanceof Error ? err.message : 'Nie udało się dodać zgłoszenia. Spróbuj ponownie.');
      return false;
    }
  };

  return {
    submit,
  };
}
