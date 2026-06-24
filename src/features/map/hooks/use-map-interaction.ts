'use client';

import type { ReportType } from '@prisma/client';
import type { MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import type { GeoJSONSource } from 'maplibre-gl';
import { type RefObject, useCallback } from 'react';
import { type PopupReport, useReportPopupStore } from '@/features/core/report';
import { useMapPickStore } from '@/shared/store/use-map-pick-store';

type FeatureLike = { id?: string | number; properties: Record<string, unknown> | null };

function featureToReport(feature: FeatureLike): PopupReport {
  const props = feature.properties ?? {};

  return {
    id: String(props.id ?? feature.id),
    type: props.type as ReportType,
    description: (props.description as string | null) ?? null,
    createdAt: String(props.createdAt ?? ''),
    expiresAt: props.expiresAt ? String(props.expiresAt) : null,
    confirmations: Number(props.confirmations ?? 0),
    flags: Number(props.flags ?? 0),
    imageUrl: props.imageUrl ? String(props.imageUrl) : null,
  };
}

/**
 * Map click handling: capture a point while picking, expand a clicked cluster (or list its
 * reports when it can't zoom in further), or open the overlay for the report(s) under the click.
 */
export function useMapInteraction(mapRef: RefObject<MapRef | null>) {
  const popup = useReportPopupStore((state) => state.popup);
  const setPopup = useReportPopupStore((state) => state.setPopup);
  const closePopup = useReportPopupStore((state) => state.closePopup);
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

      if (feature.layer.id === 'report-clusters' || feature.layer.id === 'report-cluster-dot') {
        const map = mapRef.current;
        const source = map?.getSource('reports') as GeoJSONSource | undefined;
        if (!map || !source) {
          return;
        }

        const clusterId = feature.properties?.cluster_id;

        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          // Split by zooming in only when that's actually possible; otherwise the points are
          // coincident (or we're at max zoom), so list them in the overlay.
          if (zoom > map.getZoom() && zoom <= map.getMaxZoom()) {
            map.easeTo({ center: [lng, lat], zoom });
            return;
          }

          source.getClusterLeaves(clusterId, 100, 0).then((leaves) => {
            setPopup({ lng, lat, reports: leaves.map(featureToReport) });
          });
        });

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

        const seen = new Set<string>();
        const reportsAtPoint: PopupReport[] = [];

        for (const found of nearby) {
          const report = featureToReport(found);
          if (seen.has(report.id)) {
            continue;
          }

          seen.add(report.id);
          reportsAtPoint.push(report);
        }

        setPopup({ lng, lat, reports: reportsAtPoint });
      }
    },
    [pickPoint, mapRef, setPopup],
  );

  return { popup, setPopup, closePopup, handleClick };
}
