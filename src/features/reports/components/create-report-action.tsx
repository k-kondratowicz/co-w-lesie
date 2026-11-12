'use client';

import { ReportType } from '@prisma/client';
import { MapPin, PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { createReportSchema, locationSchema, REPORT_MAX_OFFSET_METERS } from '@/features/core/report';
import { useCreateReport } from '@/features/reports/hooks/use-create-report';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useAppForm } from '@/shared/components/form/form-hooks';
import { Turnstile } from '@/shared/components/turnstile';
import { SelectItem } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import { formatDistance } from '@/shared/lib/geo/format-distance';
import { isTurnstileEnabled } from '@/shared/lib/security/turnstile-client';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useTurnstileStore } from '@/shared/store/use-turnstile-store';

// The form starts without a location; the schema still demands one before submit.
const createReportFormSchema = createReportSchema.extend({
  location: locationSchema.optional().refine((value) => value !== undefined, 'Pobierz lokalizację GPS'),
  photo: z.custom<File>().nullable().optional(),
});
type CreateReportFormValues = z.infer<typeof createReportFormSchema>;

const defaultValues: CreateReportFormValues = {
  description: '',
  type: 'OTHER',
  location: undefined,
  photo: null,
};

export function CreateReportAction() {
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
  const { submit: submitReport } = useCreateReport({ onSendFailed: resetTurnstile });

  const form = useAppForm({
    validators: {
      onChange: createReportFormSchema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      if (!value.location) {
        return false;
      }

      return submitReport({ ...value, location: value.location });
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
      loading={dialog.loading}
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
                  disabled={!form.state.values.location}
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
