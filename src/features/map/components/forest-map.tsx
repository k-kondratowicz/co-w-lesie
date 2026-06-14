'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { Map as MapGL, type MapRef } from '@vis.gl/react-maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BANS_MIN_ZOOM, MapLayers } from '@/features/map/components/map-layers';
import { useMapInteraction } from '@/features/map/hooks/use-map-interaction';
import { useViewportFeatures } from '@/features/map/hooks/use-viewport-features';
import { boundsToBbox } from '@/features/map/utils/bounds-to-bbox';
import { ReportDetailsOverlay } from '@/features/reports/components/report-details-overlay';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { LocationPermissionHelp } from '@/shared/components/location-permission-help';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useRiskOverlayStore } from '@/shared/store/use-risk-overlay-store';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const REPORT_LAYERS = ['report-clusters', 'report-cluster-dot', 'report-point'];

type ForestMapProps = { pmtilesUrl: string };

export function ForestMap({ pmtilesUrl }: ForestMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mounted, setMounted] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const [zoom, setZoom] = useState(6);

  const reports = useViewportFeatures('/api/reports', 'reports', bbox);
  const bans = useViewportFeatures('/api/bans', 'bans', bbox, zoom >= BANS_MIN_ZOOM);
  const riskOverlay = useRiskOverlayStore((state) => state.overlay);
  const isPicking = useMapPickStore((state) => state.isPicking);
  const pickConstraint = useMapPickStore((state) => state.constraint);
  const pickPurpose = useMapPickStore((state) => state.purpose);
  const {
    position: userPosition,
    status: locationStatus,
    permission: locationPermission,
    permissionDenied,
    error: locationError,
    getCurrentPosition,
  } = useGeolocation();

  const { popup, closePopup, handleClick } = useMapInteraction(mapRef);

  const requestLocation = useCallback(async () => {
    try {
      await getCurrentPosition();
      return true;
    } catch {
      return false;
    }
  }, [getCurrentPosition]);

  const permissionDialog = useActionDialog({ onConfirm: requestLocation });
  // Ensures the location prompt is handled at most once per mount — without this, the effect
  // re-runs every render (new dialog object) and re-opens right after "Nie teraz".
  const locationPromptHandled = useRef(false);

  // Register the PMTiles protocol (client-only) and reveal the map after mount — <Map> needs the DOM.
  useEffect(() => {
    maplibregl.addProtocol('pmtiles', new Protocol().tile);
    setMounted(true);
  }, []);

  // Fly to the assessed point / the user's location when they change.
  useEffect(() => {
    if (riskOverlay) {
      mapRef.current?.flyTo({ center: [riskOverlay.lng, riskOverlay.lat], zoom: 12 });
    }
  }, [riskOverlay]);

  useEffect(() => {
    if (userPosition) {
      mapRef.current?.flyTo({ center: [userPosition.longitude, userPosition.latitude], zoom: 14 });
    }
  }, [userPosition]);

  // Ask for location once on first load, tailored to the current permission:
  //   granted   → fetch silently, no dialog;
  //   prompt    → show the explainer dialog (its button triggers the browser prompt);
  //   denied    → don't nag (the map works without it; map-pick + help cover the rest);
  //   unknown   → wait for the Permissions API to resolve.
  useEffect(() => {
    if (locationPromptHandled.current || userPosition || locationStatus !== 'idle') {
      return;
    }

    if (locationPermission === 'granted') {
      locationPromptHandled.current = true;
      void requestLocation();
    } else if (locationPermission === 'prompt' || locationPermission === 'unsupported') {
      locationPromptHandled.current = true;
      permissionDialog.setOpen(true);
    }
  }, [userPosition, locationStatus, locationPermission, requestLocation, permissionDialog]);

  if (!mounted) {
    return <div className="h-screen w-full" />;
  }

  const syncViewport = (map: maplibregl.Map) => {
    setBbox(boundsToBbox(map));
    setZoom(map.getZoom());
  };

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: 19.23, latitude: 52.1, zoom: 6 }}
        minZoom={5}
        maxZoom={16}
        mapStyle={MAP_STYLE}
        cursor={isPicking ? 'crosshair' : 'auto'}
        interactiveLayerIds={REPORT_LAYERS}
        attributionControl={{ compact: false }}
        style={{ width: '100%', height: '100vh' }}
        onLoad={(event) => syncViewport(event.target)}
        onMoveEnd={(event) => syncViewport(event.target)}
        onClick={handleClick}
      >
        <MapLayers
          pmtilesUrl={pmtilesUrl}
          reports={reports}
          bans={bans}
          riskOverlay={riskOverlay}
          pickConstraint={pickConstraint}
          userPosition={userPosition}
          selectedPoint={popup ? { lng: popup.lng, lat: popup.lat } : null}
        />
      </MapGL>

      <ReportDetailsOverlay info={popup} onClose={closePopup} />

      {isPicking ? (
        <div className="absolute top-20 left-1/2 z-40 w-[calc(100%-32px)] -translate-x-1/2 rounded-lg bg-background px-4 py-2 text-center shadow-lg ring-1 ring-border sm:top-4 sm:w-auto sm:rounded-full">
          <span className="text-sm">
            {pickPurpose === 'report'
              ? 'Wskaż miejsce zgłoszenia w niebieskim okręgu lub'
              : 'Kliknij punkt na mapie, aby sprawdzić to miejsce lub'}
          </span>
          <button
            type="button"
            onClick={() => useMapPickStore.getState().cancelPicking()}
            className="ml-1 font-medium text-muted-foreground text-sm underline hover:text-foreground"
          >
            Anuluj
          </button>
        </div>
      ) : null}

      <ActionDialog
        open={permissionDialog.open}
        loading={permissionDialog.loading}
        trigger={null}
        title="Potrzebujemy dostępu do lokalizacji"
        description="Aplikacja potrzebuje Twojej lokalizacji, aby pokazać pobliskie obszary leśne i działać poprawnie. Bez tej zgody część funkcji może być niedostępna."
        onOpenChange={permissionDialog.setOpen}
        onConfirm={permissionDialog.confirm}
        isSaveHidden={permissionDenied}
        cancelLabel="Nie teraz"
        confirmLabel="Włącz lokalizację"
      >
        {permissionDenied ? (
          <LocationPermissionHelp message={locationError ?? undefined} />
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Kliknij przycisk, aby zezwolić na lokalizację w przeglądarce. Jeśli odrzucisz zgodę, aplikacja nie będzie w pełni
              funkcjonalna.
            </p>
            {locationError ? <p className="text-destructive text-sm">{locationError}</p> : null}
          </div>
        )}
      </ActionDialog>
    </>
  );
}
