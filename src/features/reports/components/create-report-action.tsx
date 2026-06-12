'use client';

import { ReportType } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, PlusIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  type CreateReportInput,
  createReportSchema,
  REPORT_MAX_OFFSET_METERS,
} from '@/features/reports/schemas/create-report.schema';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useAppForm } from '@/shared/components/form/form-hooks';
import { SelectItem } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';

async function createReport(input: CreateReportInput): Promise<{ id: string }> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Nie udało się dodać zgłoszenia. Spróbuj ponownie.');
  }
  return res.json();
}

export function CreateReportAction() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const { position, getCurrentPosition } = useGeolocation();
  const startPicking = useMapPickStore((state) => state.startPicking);
  const pickedPoint = useMapPickStore((state) => state.pickedPoint);
  const clearPicked = useMapPickStore((state) => state.clearPicked);
  // The GPS position the report offset is measured from, captured when picking starts.
  const anchorRef = useRef<{ lng: number; lat: number } | null>(null);

  const form = useAppForm({
    validators: {
      onChange: createReportSchema,
    },
    defaultValues: {
      description: '',
      type: 'OTHER',
      location: [],
    } as unknown as CreateReportInput,
  });
  const dialog = useActionDialog({
    onConfirm: async () => {
      await form.handleSubmit();
      if (!form.state.isValid) {
        return false;
      }
      try {
        await mutation.mutateAsync(form.state.values);
        toast.success('Dziękujemy! Zgłoszenie zostało dodane.');
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Nie udało się dodać zgłoszenia. Spróbuj ponownie.');
        return false;
      }
    },
    onOpenChange: (open) => {
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
              <field.Location label="Lokalizacja" description="Pobierz swoje współrzędne GPS i odśwież je w razie potrzeby." />
            )}
          </form.AppField>
          <Button type="button" variant="outline" size="sm" onClick={pickReportLocation} className="w-full">
            <MapPin className="size-4" />
            Wskaż miejsce na mapie (do {REPORT_MAX_OFFSET_METERS / 1000} km)
          </Button>
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
        </form.Form>
      </form.AppForm>
    </ActionDialog>
  );
}
