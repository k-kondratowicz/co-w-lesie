'use client';

import type { MapRef } from '@vis.gl/react-maplibre';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { useActionDialog } from '@/shared/components/dialog';
import { useGeolocation } from '@/shared/hooks/use-geolocation';

export function useLocationPrompt(mapRef: RefObject<MapRef | null>, skipInitialRecenter: boolean, defer: boolean) {
  const {
    position: userPosition,
    status: locationStatus,
    permission: locationPermission,
    permissionDenied,
    error: locationError,
    getCurrentPosition,
  } = useGeolocation();

  const requestLocation = useCallback(async () => {
    try {
      await getCurrentPosition();

      return true;
    } catch {
      return false;
    }
  }, [getCurrentPosition]);

  const permissionDialog = useActionDialog({ onConfirm: requestLocation });
  const locationPromptHandled = useRef(false);

  const skipRecenter = useRef(skipInitialRecenter);
  useEffect(() => {
    if (!userPosition) {
      return;
    }

    if (skipRecenter.current) {
      skipRecenter.current = false;

      return;
    }

    mapRef.current?.flyTo({ center: [userPosition.longitude, userPosition.latitude], zoom: 14 });
  }, [userPosition, mapRef]);

  useEffect(() => {
    if (locationPromptHandled.current || userPosition || locationStatus !== 'idle') {
      return;
    }

    if (defer) {
      return;
    }

    if (locationPermission === 'granted') {
      locationPromptHandled.current = true;
      void requestLocation();
    } else if (locationPermission === 'prompt' || locationPermission === 'unsupported') {
      locationPromptHandled.current = true;
      permissionDialog.setOpen(true);
    }
  }, [userPosition, locationStatus, locationPermission, requestLocation, permissionDialog, defer]);

  return {
    userPosition,
    permissionDenied,
    locationError,
    permissionDialog,
  };
}
