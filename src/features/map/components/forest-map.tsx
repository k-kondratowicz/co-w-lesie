'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { Map as MapGL, type MapLayerMouseEvent, type MapRef } from '@vis.gl/react-maplibre';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KmzbDetailsOverlay, type KmzbPopupInfo } from '@/features/map/components/kmzb-details-overlay';
import {
  BANS_MIN_ZOOM,
  KMZB_MIN_ZOOM,
  MapLayers,
  OVERNIGHT_ZONES_MIN_ZOOM,
  TOURISM_MIN_ZOOM,
} from '@/features/map/components/map-layers';
import { MapPickBanner } from '@/features/map/components/map-pick-banner';
import { useLocationPrompt } from '@/features/map/hooks/use-location-prompt';
import { useMapInteraction } from '@/features/map/hooks/use-map-interaction';
import { useSharedReport } from '@/features/map/hooks/use-shared-report';
import { useViewportFeatures } from '@/features/map/hooks/use-viewport-features';
import { boundsToBbox } from '@/features/map/utils/bounds-to-bbox';
import { createParkingMarkerImage, PARKING_MARKER_IMAGE, PARKING_MARKER_PIXEL_RATIO } from '@/features/map/utils/parking-marker';
import { ActionDialog } from '@/shared/components/dialog';
import { LocationPermissionHelp } from '@/shared/components/location-permission-help';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { CAMPING_KINDS, PARKING_KINDS } from '@/shared/lib/tourism/types';
import { useMapLayerStore } from '@/shared/store/use-map-layer-store';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';
import { useMapViewStore } from '@/shared/store/use-map-view-store';
import { reportsSinceIso, reportTypesParam, useReportFilterStore } from '@/shared/store/use-report-filter-store';
import { useRiskOverlayStore } from '@/shared/store/use-risk-overlay-store';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const REPORT_LAYERS = ['report-clusters', 'report-cluster-dot', 'report-point'];

type ForestMapProps = { pmtilesUrl: string };

export function ForestMap({ pmtilesUrl }: ForestMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const debouncedBbox = useDebouncedValue(bbox, 300);
  const setMapView = useMapViewStore((state) => state.setView);
  const [restoredView] = useState(() => useMapViewStore.getState().view);
  const [zoom, setZoom] = useState(restoredView?.zoom ?? 6);

  const sinceDays = useReportFilterStore((state) => state.sinceDays);
  const reportTypes = useReportFilterStore((state) => state.types);
  const reportsSince = useMemo(() => reportsSinceIso(sinceDays), [sinceDays]);
  const reportsTypes = useMemo(() => reportTypesParam(reportTypes), [reportTypes]);
  const reports = useViewportFeatures('reports', 'reports', debouncedBbox, true, reportsSince, reportsTypes);
  const bans = useViewportFeatures('bans', 'bans', debouncedBbox, zoom >= BANS_MIN_ZOOM);
  const kmzb = useViewportFeatures('kmzb', 'kmzb', debouncedBbox, zoom >= KMZB_MIN_ZOOM);

  const optionalLayers = useMapLayerStore((state) => state.visible);
  const overnightZones = useViewportFeatures(
    'overnight-zones',
    'overnight-zones',
    debouncedBbox,
    optionalLayers.overnightZones && zoom >= OVERNIGHT_ZONES_MIN_ZOOM,
  );
  const parking = useViewportFeatures(
    'tourism',
    'tourism-parking',
    debouncedBbox,
    optionalLayers.parking && zoom >= TOURISM_MIN_ZOOM,
    null,
    PARKING_KINDS.join(','),
  );
  const camping = useViewportFeatures(
    'tourism',
    'tourism-camping',
    debouncedBbox,
    optionalLayers.camping && zoom >= TOURISM_MIN_ZOOM,
    null,
    CAMPING_KINDS.join(','),
  );
  const [kmzbPopup, setKmzbPopup] = useState<KmzbPopupInfo | null>(null);
  const riskOverlay = useRiskOverlayStore((state) => state.overlay);
  const isPicking = useMapPickStore((state) => state.isPicking);
  const pickConstraint = useMapPickStore((state) => state.constraint);

  const { popup, setPopup, handleClick } = useMapInteraction(mapRef);
  const { sharedReportActive, reportShown } = useSharedReport(mapRef, loaded, popup, setPopup);
  const { userPosition, permissionDenied, locationError, permissionDialog } = useLocationPrompt(
    mapRef,
    restoredView !== null || reportShown,
    sharedReportActive,
  );

  useEffect(() => {
    maplibregl.addProtocol('pmtiles', new Protocol().tile);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (riskOverlay) {
      mapRef.current?.flyTo({ center: [riskOverlay.lng, riskOverlay.lat], zoom: 12 });
    }
  }, [riskOverlay]);

  if (!mounted) {
    return <MapLoading />;
  }

  // The parking marker is a canvas-drawn rounded square (no sprite in the Carto style provides one),
  // so it has to be registered on the map instance before its symbol layer can draw.
  const registerParkingMarker = (map: maplibregl.Map) => {
    if (map.hasImage(PARKING_MARKER_IMAGE)) {
      return;
    }

    const image = createParkingMarkerImage();
    if (image) {
      map.addImage(PARKING_MARKER_IMAGE, image, { pixelRatio: PARKING_MARKER_PIXEL_RATIO });
    }
  };

  const syncViewport = (map: maplibregl.Map) => {
    const center = map.getCenter();
    const nextZoom = map.getZoom();

    setBbox(boundsToBbox(map));
    setZoom(nextZoom);
    setMapView({ longitude: center.lng, latitude: center.lat, zoom: nextZoom });
  };

  // KMZB points open their own read-only details overlay (police data, distinct from the
  // user-report overlay). Everything else falls through to the report/pick interaction handler.
  const handleMapClick = (event: MapLayerMouseEvent) => {
    const kmzbFeature = !isPicking ? event.features?.find((feature) => feature.layer.id === 'kmzb-point') : undefined;
    if (kmzbFeature) {
      const [lng, lat] = (kmzbFeature.geometry as GeoJSON.Point).coordinates as [number, number];
      const props = kmzbFeature.properties ?? {};
      setKmzbPopup({
        lng,
        lat,
        type: String(props.type ?? ''),
        status: String(props.status ?? ''),
        eventAt: props.eventAt ? String(props.eventAt) : null,
        createdAt: String(props.createdAt ?? ''),
      });
      return;
    }

    handleClick(event);
  };

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={restoredView ?? { longitude: 19.23, latitude: 52.1, zoom: 6 }}
        minZoom={5}
        maxZoom={16}
        mapStyle={MAP_STYLE}
        cursor={isPicking ? 'crosshair' : 'auto'}
        interactiveLayerIds={[...REPORT_LAYERS, 'kmzb-point']}
        attributionControl={{ compact: false }}
        style={{ width: '100%', height: '100svh' }}
        onLoad={(event) => {
          registerParkingMarker(event.target);
          syncViewport(event.target);
          setLoaded(true);
        }}
        onMoveEnd={(event) => syncViewport(event.target)}
        onClick={handleMapClick}
      >
        <MapLayers
          pmtilesUrl={pmtilesUrl}
          reports={reports}
          bans={bans}
          kmzb={kmzb}
          overnightZones={overnightZones}
          parking={parking}
          camping={camping}
          riskOverlay={riskOverlay}
          pickConstraint={pickConstraint}
          userPosition={userPosition}
          selectedPoint={popup ? { lng: popup.lng, lat: popup.lat } : null}
        />
      </MapGL>

      {loaded ? null : <MapLoading />}

      <KmzbDetailsOverlay info={kmzbPopup} onClose={() => setKmzbPopup(null)} />

      <MapPickBanner />

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

function MapLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-1 bg-background">
      <Spinner className="size-5 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">Ładowanie mapy...</p>
    </div>
  );
}
