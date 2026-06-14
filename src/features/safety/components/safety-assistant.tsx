'use client';

import { ShieldQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRiskAssessment } from '@/features/safety/hooks/use-risk-assessment';
import { LocationPermissionHelp } from '@/shared/components/location-permission-help';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { RiskResult } from './risk-result';

export function SafetyAssistant() {
  const [open, setOpen] = useState(false);
  const { target, setTarget, data, isFetching, isError, refetch } = useRiskAssessment(open);
  const { position, getCurrentPosition, isFetching: locating, error: locationError, permissionDenied } = useGeolocation();
  const startPicking = useMapPickStore((state) => state.startPicking);
  const pickedPoint = useMapPickStore((state) => state.pickedPoint);
  const clearPicked = useMapPickStore((state) => state.clearPicked);
  const cancelPicking = useMapPickStore((state) => state.cancelPicking);

  // A point picked on the map (for safety) becomes the target, reopening the dialog with its result.
  useEffect(() => {
    if (pickedPoint?.purpose !== 'safety') {
      return;
    }

    setTarget({ lat: pickedPoint.lat, lng: pickedPoint.lng });
    setOpen(true);
    clearPicked();
  }, [pickedPoint, setTarget, clearPicked]);

  const chooseMyLocation = async () => {
    try {
      const coords = await getCurrentPosition({ force: true });
      setTarget({ lat: coords.latitude, lng: coords.longitude });
    } catch {
      // error is surfaced via locationError from the store
    }
  };

  // Hand control to the map: close the dialog so the user can click a point.
  const chooseOnMap = () => {
    startPicking('safety');
    setOpen(false);
  };

  const onOpenChange = (next: boolean) => {
    if (next) {
      cancelPicking();
    }

    setOpen(next);
    // Keep the last target and the map circle; assess current location on first open.
    if (next && !target && position) {
      setTarget({ lat: position.latitude, lng: position.longitude });
    }
  };

  function renderContent() {
    if (!target) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Wybierz lokalizację do sprawdzenia:</p>
          {permissionDenied ? (
            <LocationPermissionHelp message={locationError ?? undefined} />
          ) : (
            <Button onClick={chooseMyLocation} disabled={locating} className="w-full" size="sm">
              {locating && <Spinner />}
              Użyj mojej lokalizacji
            </Button>
          )}
          <Button variant="outline" onClick={chooseOnMap} className="w-full" size="sm">
            Wskaż punkt na mapie
          </Button>
          {!permissionDenied && locationError ? <p className="text-destructive text-sm">{locationError}</p> : null}
        </div>
      );
    }

    if (isFetching && !data) {
      return (
        <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
          <Spinner /> Sprawdzam warunki w okolicy...
        </div>
      );
    }

    if (isError) {
      return (
        <div className="space-y-3">
          <p className="text-destructive text-sm">Nie udało się pobrać oceny. Spróbuj ponownie.</p>
          <Button variant="outline" onClick={() => refetch()} className="w-full">
            Spróbuj ponownie
          </Button>
        </div>
      );
    }

    if (data) {
      return (
        <div className="space-y-4">
          <RiskResult assessment={data} />
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
          <DialogTitle className="pr-4">Czy mogę dziś bezpiecznie iść do lasu?</DialogTitle>
          <DialogDescription>Sprawdź swoją lokalizację GPS albo wskaż dowolny punkt na mapie.</DialogDescription>
        </DialogHeader>

        {renderContent()}

        {data && (
          <DialogFooter>
            <Button variant="outline" onClick={chooseMyLocation} disabled={locating || isFetching} className="sm:flex-1">
              {locating && <Spinner />}
              Moja lokalizacja
            </Button>
            <Button disabled={locating || isFetching} variant="outline" onClick={chooseOnMap} className="sm:flex-1">
              Wskaż na mapie
            </Button>
            {/* </div> */}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
