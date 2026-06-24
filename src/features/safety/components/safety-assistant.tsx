'use client';

import { ShieldQuestion, Star, StarPlus } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { findDuplicateSavedArea } from '@/features/core/saved-area';
import { useSavedAreas } from '@/features/core/saved-area/index.client';
import { useRiskAssessment } from '@/features/safety/hooks/use-risk-assessment';
import { LocationPermissionHelp } from '@/shared/components/location-permission-help';
import { Button } from '@/shared/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/shared/components/ui/responsive-dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useIsDesktop } from '@/shared/hooks/use-is-desktop';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useSafetyTargetStore } from '@/shared/store/use-safety-target-store';
import { RiskResult } from './risk-result';

export function SafetyAssistant({ savedAreas }: { savedAreas?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { target, setTarget, data, isFetching, isError, refetch, dataUpdatedAt } = useRiskAssessment(open);
  const { create: createArea, areas } = useSavedAreas();
  const online = useOnlineStatus();
  const { position, getCurrentPosition, isFetching: locating, error: locationError, permissionDenied } = useGeolocation();
  const startPicking = useMapPickStore((state) => state.startPicking);
  const pickedPoint = useMapPickStore((state) => state.pickedPoint);
  const clearPicked = useMapPickStore((state) => state.clearPicked);
  const cancelPicking = useMapPickStore((state) => state.cancelPicking);
  const requestedTarget = useSafetyTargetStore((state) => state.requested);
  const consumeRequestedTarget = useSafetyTargetStore((state) => state.consume);
  const isDesktop = useIsDesktop();

  // A point picked on the map (for safety) becomes the target, reopening the dialog with its result.
  useEffect(() => {
    if (pickedPoint?.purpose !== 'safety') {
      return;
    }

    setTarget({ lat: pickedPoint.lat, lng: pickedPoint.lng });
    setOpen(true);
    clearPicked();
  }, [pickedPoint, setTarget, clearPicked]);

  // A saved area picked from its sheet assesses that exact point + radius, reopening the dialog.
  useEffect(() => {
    if (!requestedTarget) {
      return;
    }

    setTarget(requestedTarget);
    setOpen(true);
    consumeRequestedTarget();
  }, [requestedTarget, setTarget, consumeRequestedTarget]);

  const isTargetSaved = useMemo(
    () => (target && data ? findDuplicateSavedArea(areas, target, data.radiusMeters) !== undefined : false),
    [target, data, areas],
  );

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
          {savedAreas}
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
      return <RiskResult assessment={data} isOffline={!online} lastUpdatedAt={dataUpdatedAt} />;
    }

    return null;
  }

  // Desktop: a pill that expands on hover/focus. Mobile (no hover): a plain round icon button.
  const trigger = isDesktop ? (
    <Button aria-label="Czy mogę iść do lasu?" className="group/fab h-12 gap-0 rounded-full px-0 shadow-lg">
      <span className="flex size-12 items-center justify-center">
        <ShieldQuestion className="size-5" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-left opacity-0 transition-all duration-300 ease-out group-hover/fab:max-w-[16rem] group-hover/fab:pr-5 group-hover/fab:opacity-100 group-focus-visible/fab:max-w-[16rem] group-focus-visible/fab:pr-5 group-focus-visible/fab:opacity-100">
        Czy mogę iść do lasu?
      </span>
    </Button>
  ) : (
    <Button size="icon-xxl" rounded="full" className="shadow-lg">
      <ShieldQuestion />
      <span className="sr-only">Czy mogę iść do lasu?</span>
    </Button>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Czy mogę dziś bezpiecznie iść do lasu?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Sprawdź swoją lokalizację GPS albo wskaż dowolny punkt na mapie.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogScrollArea>
          {renderContent()}

          {data ? (
            <ResponsiveDialogFooter className="sm:flex-col">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={chooseMyLocation} disabled={locating || isFetching} className="sm:flex-1">
                  {locating && <Spinner />}
                  Moja lokalizacja
                </Button>
                <Button variant="outline" onClick={chooseOnMap} disabled={locating || isFetching} className="sm:flex-1">
                  Wskaż na mapie
                </Button>
              </div>

              {target ? (
                <Button
                  variant="default"
                  onClick={() => createArea.mutate({ location: [target.lng, target.lat], radiusMeters: data.radiusMeters })}
                  disabled={createArea.isPending || !online || isTargetSaved}
                  className="w-full"
                  title={online || isTargetSaved ? undefined : 'Zapisywanie obszaru wymaga połączenia z internetem'}
                >
                  {createArea.isPending ? <Spinner /> : isTargetSaved ? <StarPlus /> : <Star />}
                  {online ? (isTargetSaved ? 'Obszar zapisany' : 'Zapisz ten obszar') : 'Zapisz ten obszar (wymaga połączenia)'}
                </Button>
              ) : null}
            </ResponsiveDialogFooter>
          ) : null}
        </ResponsiveDialogScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
