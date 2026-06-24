'use client';

import { ReportType } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { type CreateReportInput, createReportSchema, REPORT_MAX_OFFSET_METERS } from '@/features/core/report';
import { uploadReportPhoto } from '@/features/reports/upload-photo';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useAppForm } from '@/shared/components/form/form-hooks';
import { Turnstile } from '@/shared/components/turnstile';
import { SelectItem } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { ApiError, api } from '@/shared/lib/api/client';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import { formatDistance } from '@/shared/lib/geo/format-distance';
import { isTurnstileEnabled } from '@/shared/lib/security/turnstile-client';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useOfflineReportStore } from '@/shared/store/use-offline-report-store';
import { useTurnstileStore } from '@/shared/store/use-turnstile-store';

type CreateReportResult = { queued: true } | { queued: false; id: string };

async function createReport(input: CreateReportInput, turnstileToken: string | null): Promise<CreateReportResult> {
  try {
    const { id } = await api.reports.create(input, turnstileToken);

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

// Form-only schema: the API fields plus the in-progress photo File (uploaded on submit, not sent).
const createReportFormSchema = createReportSchema.extend({ photo: z.custom<File>().nullable().optional() });
type CreateReportFormValues = z.infer<typeof createReportFormSchema>;

export function CreateReportAction() {
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

  const online = useOnlineStatus();
  const turnstileToken = useTurnstileStore((state) => state.token);

  // Rendering the widget can take a few seconds; block submit until it hands us a token. Offline
  // reports skip Turnstile (they re-solve on replay), so connectivity must not gate the button.
  const turnstilePending = online && isTurnstileEnabled() && !turnstileToken;

  const { position, getCurrentPosition } = useGeolocation();
  const startPicking = useMapPickStore((state) => state.startPicking);
  const pickedPoint = useMapPickStore((state) => state.pickedPoint);
  const clearPicked = useMapPickStore((state) => state.clearPicked);
  const cancelPicking = useMapPickStore((state) => state.cancelPicking);

  // The GPS position the report offset is measured from, captured when picking starts.
  const anchorRef = useRef<{ lng: number; lat: number } | null>(null);

  // Bumping the key remounts the widget for a fresh token after a failed attempt consumed the
  // previous one; the remount resets the shared Turnstile store back to 'verifying'.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const resetTurnstile = () => setTurnstileKey((key) => key + 1);

  const form = useAppForm({
    validators: {
      onChange: createReportFormSchema,
    },
    defaultValues: {
      description: '',
      type: 'OTHER',
      location: [],
      photo: null,
    } as unknown as CreateReportFormValues,
    onSubmit: async ({ value }) => {
      const { photo, ...report } = value;
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
        resetTurnstile();
        toast.error(err instanceof Error ? err.message : 'Nie udało się dodać zgłoszenia. Spróbuj ponownie.');
        return false;
      }
    },
  });

  const dialog = useActionDialog({
    onConfirm: async () => {
      await form.handleSubmit();

      if (!form.state.isValid) {
        return false;
      }
    },
    onOpenChange: (open) => {
      if (open) {
        cancelPicking();
      }

      // Don't wipe the form when we close the dialog just to let the user pick a point on the map.
      if (!open && !useMapPickStore.getState().isPicking) {
        form.reset();
      }
    },
  });

  // Start picking a report location on the map, constrained to within REPORT_MAX_OFFSET_METERS
  // of the reporter's GPS. Closing the dialog hands control to the map.
  const pickReportLocation = async () => {
    let anchor = position;
    if (!anchor) {
      try {
        anchor = await getCurrentPosition();
      } catch {
        return; // no location → can't constrain the offset
      }
    }

    anchorRef.current = { lng: anchor.longitude, lat: anchor.latitude };
    startPicking('report', { lng: anchor.longitude, lat: anchor.latitude, radiusMeters: REPORT_MAX_OFFSET_METERS });
    dialog.setOpen(false);
  };

  // Accept a point picked for the report only if it's within the allowed offset, then reopen.
  useEffect(() => {
    if (pickedPoint?.purpose !== 'report') {
      return;
    }

    const anchor = anchorRef.current;
    const point = pickedPoint;
    clearPicked();
    dialog.setOpen(true);

    if (!anchor) {
      return;
    }

    if (distanceMeters(anchor.lng, anchor.lat, point.lng, point.lat) > REPORT_MAX_OFFSET_METERS) {
      toast.error(`Wybierz miejsce maksymalnie ${formatDistance(REPORT_MAX_OFFSET_METERS)} od swojej lokalizacji.`);
      return;
    }

    // The near-forest rule is enforced on submit by POST /api/reports.
    form.setFieldValue('location', [point.lng, point.lat]);
  }, [pickedPoint, clearPicked, form, dialog]);

  return (
    <ActionDialog
      title="Zgłoś sytuację w lesie 🌲"
      description="Dodaj informacje o sytuacji, którą zauważyłeś(-aś) w lesie. Zgłoszenie może pomóc innym użytkownikom ocenić bezpieczeństwo okolicy."
      open={dialog.open}
      onOpenChange={dialog.setOpen}
      onConfirm={dialog.confirm}
      loading={form.state.isSubmitting}
      isSaveDisabled={turnstilePending}
      trigger={
        <Button size="icon-xxl" rounded="full" className="shadow-lg">
          <PlusIcon />
          <span className="sr-only">Dodaj zgłoszenie</span>
        </Button>
      }
    >
      <form.AppForm>
        <form.Form>
          <form.AppField name="description">{(field) => <field.Input label="Opis sytuacji" />}</form.AppField>
          <form.AppField name="location">
            {(field) => (
              <field.Location label="Lokalizacja" description="Pobierz swoje współrzędne GPS i odśwież je w razie potrzeby.">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={pickReportLocation}
                  className="w-full"
                  disabled={form.state.values.location.length !== 2}
                >
                  <MapPin />
                  Wskaż miejsce na mapie (do {formatDistance(REPORT_MAX_OFFSET_METERS)})
                </Button>
              </field.Location>
            )}
          </form.AppField>
          <form.AppField name="type">
            {(field) => (
              <field.Select label="Typ sytuacji">
                {[...Object.values(ReportType)].map((type) => (
                  <SelectItem key={type} value={type}>
                    {reportTypeLabel(type)}
                  </SelectItem>
                ))}
              </field.Select>
            )}
          </form.AppField>

          <form.AppField name="photo">{(field) => <field.Photo label="Zdjęcie (opcjonalnie)" />}</form.AppField>

          <Turnstile key={turnstileKey} />
        </form.Form>
      </form.AppForm>
    </ActionDialog>
  );
}
