'use client';

import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { PushToggle } from '@/features/push/components/push-toggle';
import { SavedAreasList } from '@/features/saved-areas/components/saved-areas-list';
import { Button } from '@/shared/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/shared/components/ui/responsive-dialog';
import { useSafetyTargetStore } from '@/shared/store/use-safety-target-store';

// Standalone surface for the saved areas: lists each with its last-known status. Picking one hands
// the point to the safety assistant (via the target channel), which opens with the full assessment.
export function SavedAreasSheet() {
  const [open, setOpen] = useState(false);
  const requestTarget = useSafetyTargetStore((state) => state.request);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button size="icon-xxl" rounded="full" variant="secondary" className="shadow-lg">
          <Bookmark />
          <span className="sr-only">Zapisane obszary</span>
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Zapisane obszary</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Ostatnio znana ocena dla każdego obszaru. Dotknij, aby sprawdzić aktualne warunki.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogScrollArea className="max-sm:pb-4">
          <SavedAreasList
            emptyMessage="Nie masz jeszcze zapisanych obszarów. Sprawdź lokalizację w asystencie i zapisz ją."
            onSelect={(area) => {
              requestTarget({ lat: area.lat, lng: area.lng, radiusMeters: area.radiusMeters });
              setOpen(false);
            }}
          />

          <div className="mt-4 border-t pt-3">
            <PushToggle />
          </div>
        </ResponsiveDialogScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
