'use client';

import { ReportType } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, PlusIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  type CreateReportInput,
  createReportSchema,
  REPORT_MAX_OFFSET_METERS,
} from '@/features/reports/schemas/create-report.schema';
import { uploadReportPhoto } from '@/features/reports/upload-photo';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useAppForm } from '@/shared/components/form/form-hooks';
import { SelectItem } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useOfflineReportStore } from '@/shared/store/use-offline-report-store';

type CreateReportResult = { queued: true } | { queued: false; id: string };

async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  let res: Response;

  try {
    res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    // Network failure (offline): queue it. GPS coordinates captured offline are still valid,
    // so the report is sent - and validated - once connectivity returns.
    useOfflineReportStore.getState().enqueue(input);

    return { queued: true };
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Nie udało się dodać zgłoszenia. Spróbuj ponownie.');
  }

  const { id } = (await res.json()) as { id: string };

  return { queued: false, id };
}

// Form-only schema: the API fields plus the in-progress photo File (uploaded on submit, not sent).
const createReportFormSchema = createReportSchema.extend({ photo: z.custom<File>().nullable().optional() });
type CreateReportFormValues = z.infer<typeof createReportFormSchema>;

export function CreateReportAction() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createReport,
    // Run even when offline so createReport can catch the failure and queue the report
    // (default 'online' would pause the mutation instead of calling it).
    networkMode: 'always',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const { position, getCurrentPosition } = useGeolocation();
  const startPicking = useMapPickStore((state) => state.startPicking);
  const pickedPoint = useMapPickStore((state) => state.pickedPoint);
  const clearPicked = useMapPickStore((state) => state.clearPicked);
  const cancelPicking = useMapPickStore((state) => state.cancelPicking);

  // The GPS position the report offset is measured from, captured when picking starts.
  const anchorRef = useRef<{ lng: number; lat: number } | null>(null);

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

      try {
        const result = await mutation.mutateAsync({ ...report, imageKey });
        toast.success(
          result.queued
            ? 'Brak internetu - zgłoszenie wyślemy automatycznie, gdy wróci połączenie.'
            : 'Dziękujemy! Zgłoszenie zostało dodane.',
        );

        return true;
      } catch (err) {
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
      toast.error(`Wybierz miejsce maksymalnie ${REPORT_MAX_OFFSET_METERS / 1000} km od swojej lokalizacji.`);
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
      trigger={
        <Button size="icon-xxl" className="rounded-full">
          <PlusIcon className="size-5" />
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
                  <MapPin className="size-4" />
                  Wskaż miejsce na mapie (do {REPORT_MAX_OFFSET_METERS / 1000} km)
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
        </form.Form>
      </form.AppForm>
    </ActionDialog>
  );
}
