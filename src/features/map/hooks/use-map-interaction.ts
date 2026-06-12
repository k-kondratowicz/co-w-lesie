'use client';

import type { MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import type { GeoJSONSource } from 'maplibre-gl';
import { type RefObject, useCallback, useState } from 'react';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';

export type PopupReport = { id: string; type: string; description: string | null };
export type PopupInfo = { lng: number; lat: number; reports: PopupReport[] };

/**
 * Map click handling: capture a point while picking, expand a clicked cluster, or open a popup
 * listing every report under the click (so stacked/overlapping points are all reachable).
 */
export function useMapInteraction(mapRef: RefObject<MapRef | null>) {
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const pickPoint = useMapPickStore((state) => state.pickPoint);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (useMapPickStore.getState().isPicking) {
        pickPoint(event.lngLat.lng, event.lngLat.lat);
        return;
      }
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (feature.layer.id === 'report-clusters') {
        const clusterId = feature.properties?.cluster_id;
        const source = mapRef.current?.getSource('reports') as GeoJSONSource | undefined;
        source?.getClusterExpansionZoom(clusterId).then((zoom) => mapRef.current?.easeTo({ center: [lng, lat], zoom }));
        return;
      }
      if (feature.layer.id === 'report-point') {
        // Gather every report within a few pixels so stacked/overlapping points all show.
        const { x, y } = event.point;
        const nearby =
          mapRef.current?.queryRenderedFeatures(
            [
              [x - 6, y - 6],
              [x + 6, y + 6],
            ],
            { layers: ['report-point'] },
          ) ?? [];
        const seen = new Set<unknown>();
        const reportsAtPoint: PopupReport[] = [];
        for (const found of nearby) {
          const id = String(found.properties?.id ?? found.id);
          if (seen.has(id)) {
            continue;
          }
          seen.add(id);
          reportsAtPoint.push({ id, type: String(found.properties?.type), description: found.properties?.description ?? null });
        }
        setPopup({ lng, lat, reports: reportsAtPoint });
      }
    },
    [pickPoint, mapRef],
  );

  const closePopup = useCallback(() => setPopup(null), []);

  return { popup, closePopup, handleClick };
}
