'use client';

import { ShieldQuestion } from 'lucide-react';
import { useState } from 'react';
import { useRiskAssessment } from '@/features/safety/hooks/use-risk-assessment';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { RiskResult } from './risk-result';

export function SafetyAssistant() {
  const [open, setOpen] = useState(false);
  const { target, setTarget, data, isFetching, isError, refetch } = useRiskAssessment(open);
  const { position, getCurrentPosition, isFetching: locating, error: locationError } = useGeolocation();

  const useMyLocation = async () => {
    try {
      const coords = position ?? (await getCurrentPosition());
      setTarget({ lat: coords.latitude, lng: coords.longitude });
    } catch {
      // error is surfaced via locationError from the store
    }
  };

  // Re-acquire location and re-assess. The circle on the map stays until the next assessment.
  const refresh = async () => {
    try {
      const coords = await getCurrentPosition();
      setTarget({ lat: coords.latitude, lng: coords.longitude });
    } catch {
      // error is surfaced via locationError from the store
    }
    await refetch();
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Keep the last target and the map circle; assess location on first open.
    if (next && !target && position) {
      setTarget({ lat: position.latitude, lng: position.longitude });
    }
  };

  function renderContent() {
    if (!target) {
      return (
        <div className="space-y-3">
          <Button onClick={useMyLocation} disabled={locating} className="w-full">
            {locating && <Spinner />}
            Sprawdź moją lokalizację
          </Button>
          {locationError ? <p className="text-destructive text-sm">{locationError}</p> : null}
        </div>
      );
    }

    // Keep the result visible during a background refetch; only block on the first load.
    if (isFetching && !data) {
      return (
        <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
          <Spinner /> Sprawdzam warunki w okolicy…
        </div>
      );
    }
    if (isError) {
      return (
        <div className="space-y-3">
          <p className="text-destructive text-sm">Nie udało się pobrać oceny. Spróbuj ponownie.</p>
          <Button variant="outline" onClick={refresh} className="w-full">
            Spróbuj ponownie
          </Button>
        </div>
      );
    }
    if (data) {
      return (
        <div className="space-y-4">
          <RiskResult assessment={data} />
          <Button variant="outline" onClick={refresh} disabled={locating || isFetching} className="w-full">
            {(locating || isFetching) && <Spinner />}
            Odśwież ocenę
          </Button>
        </div>
      );
    }
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button aria-label="Czy mogę iść do lasu?" className="group/fab h-12 gap-0 rounded-full px-0 shadow-lg">
          <span className="flex size-12 items-center justify-center">
            <ShieldQuestion className="size-5" />
          </span>
          {/* Collapsed = icon-only circle; expands smoothly to a pill on hover/focus. */}
          <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-left opacity-0 transition-all duration-300 ease-out group-hover/fab:max-w-[16rem] group-hover/fab:pr-5 group-hover/fab:opacity-100 group-focus-visible/fab:max-w-[16rem] group-focus-visible/fab:pr-5 group-focus-visible/fab:opacity-100">
            Czy mogę iść do lasu?
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Czy mogę dziś bezpiecznie iść do lasu?</DialogTitle>
          <DialogDescription>
            Sprawdzimy zgłoszenia, zagrożenie pożarowe i zakazy wstępu w pobliżu Twojej lokalizacji.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
