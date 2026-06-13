'use client';

import { Layer, Marker, Popup, Source } from '@vis.gl/react-maplibre';
import { X } from 'lucide-react';
import type { PopupInfo } from '@/features/map/hooks/use-map-interaction';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { circlePolygon } from '@/shared/lib/geo/circle';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import type { PickConstraint } from '@/shared/store/use-map-pick-store';
import type { RiskOverlay } from '@/shared/store/use-risk-overlay-store';

const FOREST_SOURCE_LAYER = 'forests'; // matches tippecanoe `-l forests`
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const RISK_COLORS = { GREEN: '#16a34a', YELLOW: '#f59e0b', RED: '#dc2626' } as const;
export const BANS_MIN_ZOOM = 9; // only fetch/draw ban polygons once zoomed into a region

interface MapLayersProps {
  pmtilesUrl: string;
  reports: GeoJSON.FeatureCollection | null;
  bans: GeoJSON.FeatureCollection | null;
  riskOverlay: RiskOverlay | null;
  pickConstraint: PickConstraint | null;
  userPosition: GeolocationPosition['coords'] | null;
  popup: PopupInfo | null;
  onPopupClose: () => void;
}

export function MapLayers({
  pmtilesUrl,
  reports,
  bans,
  riskOverlay,
  pickConstraint,
  userPosition,
  popup,
  onPopupClose,
}: MapLayersProps) {
  // Resolve a same-origin relative path to an absolute URL (no CORS, full URL for the PMTiles lib).
  const resolvedUrl = pmtilesUrl.startsWith('/') ? `${window.location.origin}${pmtilesUrl}` : pmtilesUrl;
  const circleData = riskOverlay ? circlePolygon(riskOverlay.lng, riskOverlay.lat, riskOverlay.radiusMeters) : EMPTY_FC;
  const circleColor = riskOverlay ? RISK_COLORS[riskOverlay.level] : RISK_COLORS.GREEN;

  // The center pin only adds info when the assessed point isn't the user's own location (where
  // the blue location dot already sits) — e.g. when they picked a different point on the map.
  const showRiskCenter =
    riskOverlay !== null &&
    (userPosition === null ||
      distanceMeters(userPosition.longitude, userPosition.latitude, riskOverlay.lng, riskOverlay.lat) > 25);

  return (
    <>
      {/* Forests: deferred to higher zooms (low-zoom tiles are heavy). */}
      <Source id="forests" type="vector" url={`pmtiles://${resolvedUrl}`}>
        <Layer
          id="forest-fill"
          type="fill"
          source-layer={FOREST_SOURCE_LAYER}
          minzoom={8}
          paint={{ 'fill-color': '#2e7d32', 'fill-opacity': 0.1 }}
        />
        <Layer
          id="forest-outline"
          type="line"
          source-layer={FOREST_SOURCE_LAYER}
          minzoom={11}
          paint={{ 'line-color': '#1b5e20', 'line-width': 1, 'line-opacity': 0.1 }}
        />
      </Source>

      {/* Active forest-entry bans (live GeoJSON from /api/bans) — the actual closed areas. */}
      <Source id="bans" type="geojson" data={bans ?? EMPTY_FC}>
        <Layer id="ban-fill" type="fill" minzoom={BANS_MIN_ZOOM} paint={{ 'fill-color': '#dc2626', 'fill-opacity': 0.18 }} />
        <Layer
          id="ban-outline"
          type="line"
          minzoom={BANS_MIN_ZOOM}
          paint={{ 'line-color': '#b91c1c', 'line-width': 1.5, 'line-opacity': 0.7 }}
        />
      </Source>

      {/* Allowed-area hint while picking a constrained point (e.g. report within 2 km of GPS). */}
      {pickConstraint ? (
        <Source
          id="pick-constraint"
          type="geojson"
          data={circlePolygon(pickConstraint.lng, pickConstraint.lat, pickConstraint.radiusMeters)}
        >
          <Layer id="pick-constraint-fill" type="fill" paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.08 }} />
          <Layer
            id="pick-constraint-line"
            type="line"
            paint={{ 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [2, 2] }}
          />
        </Source>
      ) : null}

      {/* Risk circle: fed by the safety-assistant overlay store, colored by level. */}
      <Source id="risk-circle" type="geojson" data={circleData}>
        <Layer id="risk-circle-fill" type="fill" paint={{ 'fill-color': circleColor, 'fill-opacity': 0.15 }} />
        <Layer id="risk-circle-line" type="line" paint={{ 'line-color': circleColor, 'line-width': 2 }} />
      </Source>

      {/* Reports: clustered GeoJSON from /api/reports. */}
      <Source id="reports" type="geojson" data={reports ?? EMPTY_FC} cluster clusterRadius={50} clusterMaxZoom={14}>
        <Layer
          id="report-clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': ['step', ['get', 'point_count'], '#f59e0b', 10, '#f97316', 30, '#ef4444'],
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
            'circle-opacity': 0.85,
          }}
        />
        <Layer
          id="report-cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }}
          paint={{ 'text-color': '#ffffff' }}
        />
        <Layer
          id="report-point"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{ 'circle-color': '#ef4444', 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' }}
        />
      </Source>

      {userPosition ? (
        <Marker longitude={userPosition.longitude} latitude={userPosition.latitude}>
          <div className="size-4.5 rounded-full border-2 border-white bg-[#4285F4] shadow-[0_0_0_6px_rgba(66,133,244,0.15),0_2px_6px_rgba(0,0,0,0.3)]" />
        </Marker>
      ) : null}

      {/* Center pin of the assessed point — only when it differs from the user's own location. */}
      {showRiskCenter && riskOverlay ? (
        <Marker longitude={riskOverlay.lng} latitude={riskOverlay.lat}>
          <div className="size-3.5 rounded-full border-2 border-white" style={{ backgroundColor: circleColor }} />
        </Marker>
      ) : null}

      {popup ? (
        <Popup
          longitude={popup.lng}
          latitude={popup.lat}
          onClose={onPopupClose}
          closeButton={false}
          closeOnClick={false}
          closeOnMove
          offset={14}
          className="forest-popup font-normal font-sans"
        >
          <div className="relative min-w-44 rounded-lg border bg-popover p-3 pr-8 text-popover-foreground shadow-md">
            <button
              type="button"
              onClick={onPopupClose}
              aria-label="Zamknij"
              className="absolute top-2 right-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-2">
              {popup.reports.length > 1 ? (
                <p className="font-medium text-muted-foreground text-xs">{popup.reports.length} zgłoszenia w tym miejscu</p>
              ) : null}

              {popup.reports.map((report) => (
                <div key={report.id} className="border-border/60 border-b pb-2 last:border-0 last:pb-0">
                  <p className="font-medium">{reportTypeLabel(report.type)}</p>
                  {report.description ? <p className="mt-0.5 text-sm">{report.description}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </Popup>
      ) : null}
    </>
  );
}
