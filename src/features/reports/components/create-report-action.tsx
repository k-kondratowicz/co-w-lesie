'use client';

import { ReportType } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { type CreateReportInput, createReportSchema } from '@/features/reports/schemas/create-report.schema';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useAppForm } from '@/shared/components/form/form-hooks';
import { SelectItem } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/button';

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
      if (!open) {
        form.reset();
      }
    },
  });

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
          <form.AppField name="type">
            {(field) => (
              <field.Select label="Typ sytuacji">
                {[...Object.values(ReportType)].map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
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
