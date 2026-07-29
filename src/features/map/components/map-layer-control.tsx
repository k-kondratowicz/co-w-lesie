'use client';

import { Layers } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/shared/components/ui/responsive-dialog';
import { Switch } from '@/shared/components/ui/switch';
import { type OptionalMapLayer, useMapLayerStore, visibleLayerCount } from '@/shared/store/use-map-layer-store';

const LAYER_OPTIONS: { id: OptionalMapLayer; label: string; hint: string }[] = [
  {
    id: 'overnightZones',
    label: 'Zanocuj w lesie',
    hint: 'Obszary programu Lasów Państwowych, gdzie dozwolone jest nocowanie',
  },
  {
    id: 'parking',
    label: 'Parkingi i miejsca postoju',
    hint: 'Parkingi leśne oraz miejsca postoju pojazdów',
  },
  {
    id: 'camping',
    label: 'Miejsca i pola biwakowe',
    hint: 'Powierzchniowa baza noclegowa Lasów Państwowych',
  },
];

// Optional tourism layers the user can switch on. Same surface as the saved areas - centered
// dialog on desktop, bottom drawer on touch.
export function MapLayerControl() {
  const [open, setOpen] = useState(false);
  const visible = useMapLayerStore((state) => state.visible);
  const toggle = useMapLayerStore((state) => state.toggle);
  const activeCount = visibleLayerCount(visible);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button size="icon-xxl" rounded="full" variant="secondary" className="relative shadow-lg">
          <Layers />
          <span className="sr-only">Warstwy mapy</span>
          {/* A dot so an enabled layer is visible while the dialog is closed. */}
          {activeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Warstwy mapy</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Dane turystyczne z Banku Danych o Lasach. Brak obiektu na mapie nie oznacza, że nocleg lub postój jest w danym miejscu
            dozwolony - obowiązują zakazy wstępu i zasady nadleśnictwa.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogScrollArea className="flex flex-col gap-4 max-sm:pb-4">
          {LAYER_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-start justify-between gap-3">
              <Label htmlFor={`layer-${option.id}`} className="flex flex-col items-start gap-0.5 font-normal">
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-muted-foreground text-xs">{option.hint}</span>
              </Label>
              <Switch id={`layer-${option.id}`} checked={visible[option.id]} onCheckedChange={() => toggle(option.id)} />
            </div>
          ))}
        </ResponsiveDialogScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
