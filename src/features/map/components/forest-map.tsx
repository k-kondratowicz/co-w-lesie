'use client';

import { useQuery } from '@tanstack/react-query';
import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionDialog, useActionDialog } from '@/shared/components/dialog';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { circlePolygon } from '@/shared/lib/geo/circle';
import { useRiskOverlayStore } from '@/shared/store/use-risk-overlay-store';

import 'maplibre-gl/dist/maplibre-gl.css';

const RISK_COLORS = { GREEN: '#16a34a', YELLOW: '#f59e0b', RED: '#dc2626' } as const;

type Props = {
  pmtilesUrl: string;
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function boundsToBbox(map: maplibregl.Map): string {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');
}

async function fetchReports(bbox: string) {
  const res = await fetch(`/api/reports?bbox=${encodeURIComponent(bbox)}`);
  if (!res.ok) {
    throw new Error(`Reports request failed with status ${res.status}`);
  }
  return res.json();
}

export function ForestMap({ pmtilesUrl }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [bbox, setBbox] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const riskOverlay = useRiskOverlayStore((state) => state.overlay);
  const { position: userPosition, status: locationStatus, error: locationError, getCurrentPosition } = useGeolocation();

  // Reports for the current viewport. Re-fetches on pan/zoom (bbox changes) and whenever a
  // new report is added (the create mutation invalidates the ['reports'] query).
  const { data: reports } = useQuery({
    queryKey: ['reports', bbox],
    // biome-ignore lint/style/noNonNullAssertion: We check bbox !== null in enabled, so it's safe to assert here.
    queryFn: () => fetchReports(bbox!),
    enabled: bbox !== null,
  });

  const requestLocation = useCallback(async () => {
    try {
      await getCurrentPosition();
      return true;
    } catch {
      return false;
    }
  }, [getCurrentPosition]);

  const permissionDialog = useActionDialog({
    onConfirm: requestLocation,
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [19.23, 52.1], // Polska
      zoom: 6,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    // Resolve a same-origin relative path (e.g. "/poland_forests.pmtiles") to an absolute URL
    // so it loads from whatever dev port we're on — no CORS, and the PMTiles lib gets a full URL.
    const resolvedUrl = pmtilesUrl.startsWith('/') ? `${window.location.origin}${pmtilesUrl}` : pmtilesUrl;

    map.on('load', async () => {
      // Read PMTiles metadata so we don't guess the source-layer name.
      const p = new pmtiles.PMTiles(resolvedUrl);
      const metadata = await p.getMetadata();
      const sourceLayer = (metadata as { vector_layers?: Array<{ id: string }> }).vector_layers?.[0]?.id;

      if (sourceLayer) {
        map.addSource('forests', { type: 'vector', url: `pmtiles://${resolvedUrl}` });
        // Defer forests to higher zooms: the low-zoom (country/regional) tiles are heavy, so
        // not fetching them until you zoom into a region keeps the initial view fast.
        map.addLayer({
          id: 'forest-fill',
          type: 'fill',
          source: 'forests',
          'source-layer': sourceLayer,
          minzoom: 8,
          paint: { 'fill-color': '#2e7d32', 'fill-opacity': 0.1 },
        });
        map.addLayer({
          id: 'forest-outline',
          type: 'line',
          source: 'forests',
          'source-layer': sourceLayer,
          minzoom: 11,
          paint: { 'line-color': '#1b5e20', 'line-width': 1, 'line-opacity': 0.1 },
        });
      }

      // Risk circle: drawn beneath the reports, fed by the safety-assistant overlay store.
      map.addSource('risk-circle', { type: 'geojson', data: EMPTY_FC });
      map.addLayer({
        id: 'risk-circle-fill',
        type: 'fill',
        source: 'risk-circle',
        paint: { 'fill-color': RISK_COLORS.GREEN, 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'risk-circle-line',
        type: 'line',
        source: 'risk-circle',
        paint: { 'line-color': RISK_COLORS.GREEN, 'line-width': 2 },
      });

      // Reports: clustered GeoJSON source fed from /api/reports.
      map.addSource('reports', {
        type: 'geojson',
        data: EMPTY_FC,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });
      map.addLayer({
        id: 'report-clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#f59e0b', 10, '#f97316', 30, '#ef4444'],
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
          'circle-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'report-cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'report-point',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#ef4444',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Clicking a cluster zooms in to expand it.
      map.on('click', 'report-clusters', async (e) => {
        const feature = e.features?.[0];
        if (!feature) {
          return;
        }
        const clusterId = feature.properties?.cluster_id;
        if (clusterId === undefined) {
          return;
        }
        const source = map.getSource('reports') as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });

      // Clicking a single report shows its details.
      map.on('click', 'report-point', (e) => {
        const feature = e.features?.[0];
        if (!feature) {
          return;
        }
        const props = feature.properties ?? {};
        const description = props.description ? `<p style="margin:4px 0 0">${props.description}</p>` : '';
        new maplibregl.Popup()
          .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<div style="min-width:160px"><strong>${props.type}</strong>${description}</div>`)
          .addTo(map);
      });

      for (const layer of ['report-clusters', 'report-point']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Load reports for the initial view, then on every pan/zoom.
      setBbox(boundsToBbox(map));
      map.on('moveend', () => setBbox(boundsToBbox(map)));

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pmtilesUrl]);

  // Draw (or clear) the risk circle when the safety assistant updates the overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    const source = map.getSource('risk-circle') as maplibregl.GeoJSONSource | undefined;
    if (!source) {
      return;
    }
    if (!riskOverlay) {
      source.setData(EMPTY_FC);
      return;
    }
    const color = RISK_COLORS[riskOverlay.level];
    map.setPaintProperty('risk-circle-fill', 'fill-color', color);
    map.setPaintProperty('risk-circle-line', 'line-color', color);
    source.setData(circlePolygon(riskOverlay.lng, riskOverlay.lat, riskOverlay.radiusMeters));
    map.flyTo({ center: [riskOverlay.lng, riskOverlay.lat], zoom: 12 });
  }, [riskOverlay, mapReady]);

  // Push fetched reports into the map source whenever they change.
  useEffect(() => {
    const source = mapRef.current?.getSource('reports') as maplibregl.GeoJSONSource | undefined;
    if (source && reports) {
      source.setData(reports);
    }
  }, [reports]);

  useEffect(() => {
    if (!userPosition || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const { latitude, longitude } = userPosition;

    map.flyTo({ center: [longitude, latitude], zoom: 14 });

    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]).addTo(map);
      return;
    }

    const el = document.createElement('div');
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.background = '#4285F4';
    el.style.border = '2px solid white';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 0 0 6px rgba(66,133,244,0.15), 0 2px 6px rgba(0,0,0,0.3)';
    el.style.transform = 'translate(-50%, -50%)';

    markerRef.current = new maplibregl.Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [userPosition]);

  useEffect(() => {
    if (!userPosition && locationStatus === 'idle') {
      permissionDialog.setOpen(true);
    }
  }, [userPosition, permissionDialog, locationStatus]);

  return (
    <>
      <div ref={containerRef} className="h-screen w-full" />
      <ActionDialog
        open={permissionDialog.open}
        loading={permissionDialog.loading}
        trigger={null}
        title="Potrzebujemy dostępu do lokalizacji"
        description="Aplikacja potrzebuje Twojej lokalizacji, aby pokazać pobliskie obszary leśne i działać poprawnie. Bez tej zgody część funkcji może być niedostępna."
        onOpenChange={permissionDialog.setOpen}
        onConfirm={permissionDialog.confirm}
        cancelLabel="Nie teraz"
        confirmLabel="Włącz lokalizację"
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Kliknij przycisk, aby zezwolić na lokalizację w przeglądarce. Jeśli odrzucisz zgodę, aplikacja nie będzie w pełni
            funkcjonalna.
          </p>
          {locationError ? <p className="text-destructive text-sm">{locationError}</p> : null}
        </div>
      </ActionDialog>
    </>
  );
}
