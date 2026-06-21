'use client';

import { Layer, Marker, Source } from '@vis.gl/react-maplibre';
import { circlePolygon } from '@/shared/lib/geo/circle';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import type { PickConstraint } from '@/shared/store/use-map-pick-store';
import type { RiskOverlay } from '@/shared/store/use-risk-overlay-store';

const FOREST_SOURCE_LAYER = 'forests'; // matches tippecanoe `-l forests`
const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const RISK_COLORS = { GREEN: '#16a34a', YELLOW: '#f59e0b', RED: '#dc2626' } as const;
export const BANS_MIN_ZOOM = 9; // only fetch/draw ban polygons once zoomed into a region
export const KMZB_MIN_ZOOM = 9; // police incidents are dense nationwide - draw once zoomed in

interface MapLayersProps {
  pmtilesUrl: string;
  reports: GeoJSON.FeatureCollection | null;
  bans: GeoJSON.FeatureCollection | null;
  kmzb: GeoJSON.FeatureCollection | null;
  riskOverlay: RiskOverlay | null;
  pickConstraint: PickConstraint | null;
  userPosition: GeolocationPosition['coords'] | null;
  // The tapped report location - highlighted while its details overlay is open.
  selectedPoint: { lng: number; lat: number } | null;
}

export function MapLayers({
  pmtilesUrl,
  reports,
  bans,
  kmzb,
  riskOverlay,
  pickConstraint,
  userPosition,
  selectedPoint,
}: MapLayersProps) {
  // Resolve a same-origin relative path to an absolute URL (no CORS, full URL for the PMTiles lib).
  const resolvedUrl = pmtilesUrl.startsWith('/') ? `${window.location.origin}${pmtilesUrl}` : pmtilesUrl;
  const circleData = riskOverlay ? circlePolygon(riskOverlay.lng, riskOverlay.lat, riskOverlay.radiusMeters) : EMPTY_FC;
  const circleColor = riskOverlay ? RISK_COLORS[riskOverlay.level] : RISK_COLORS.GREEN;

  // The center pin only adds info when the assessed point isn't the user's own location (where
  // the blue location dot already sits) - e.g. when they picked a different point on the map.
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

      {/* Active forest-entry bans (live GeoJSON from /api/bans) - the actual closed areas. */}
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

      {/* KMZB police incidents near forests (live GeoJSON from /api/kmzb). A distinct layer from
          user reports - police-sourced - so it reads as a different, higher-trust signal. */}
      <Source id="kmzb" type="geojson" data={kmzb ?? EMPTY_FC}>
        <Layer
          id="kmzb-point"
          type="circle"
          minzoom={KMZB_MIN_ZOOM}
          paint={{
            'circle-color': '#4338ca',
            'circle-radius': 5,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
            'circle-stroke-opacity': 0.9,
          }}
        />
      </Source>

      {/* Reports: clustered GeoJSON from /api/reports. */}
      {/* clusterMaxZoom = map maxZoom so close points always merge (never fuzzy stacked dots).
          Zoomed out: count bubbles. Zoomed in (≥ z14): clusters render as a single red dot like
          a lone report - tapping it lists the few reports there. */}
      <Source
        id="reports"
        type="geojson"
        data={reports ?? EMPTY_FC}
        cluster
        clusterRadius={40}
        clusterMaxZoom={16}
        // Sum members' age-opacity so the merged dot can fade like the reports it represents
        // (avg = sum / point_count). Computed once per cluster in the worker - cheap.
        clusterProperties={{ opacitySum: ['+', ['get', 'opacity']] }}
      >
        <Layer
          id="report-clusters"
          type="circle"
          filter={['has', 'point_count']}
          maxzoom={14}
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
          maxzoom={14}
          layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }}
          paint={{ 'text-color': '#ffffff' }}
        />
        <Layer
          id="report-cluster-dot"
          type="circle"
          filter={['has', 'point_count']}
          minzoom={14}
          paint={{
            'circle-color': [
              'interpolate',
              ['linear'],
              ['/', ['get', 'opacitySum'], ['get', 'point_count']],
              0.35,
              '#eab308',
              0.65,
              '#f97316',
              1.0,
              '#ef4444',
            ],
            'circle-radius': 12,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
            'circle-stroke-opacity': 0.9,
          }}
        />
        <Layer
          id="report-cluster-dot-count"
          type="symbol"
          filter={['has', 'point_count']}
          minzoom={14}
          layout={{
            // Cap at "9+" so the count stays legible inside the dot.
            'text-field': ['case', ['>', ['get', 'point_count'], 9], '9+', ['to-string', ['get', 'point_count']]],
            'text-size': 11,
          }}
          paint={{ 'text-color': '#ffffff' }}
        />
        <Layer
          id="report-point"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'opacity'], 0.9],
              0.35,
              '#eab308',
              0.65,
              '#f97316',
              1.0,
              '#ef4444',
            ],
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
            'circle-stroke-opacity': 0.9,
          }}
        />
      </Source>

      {userPosition ? (
        <Marker longitude={userPosition.longitude} latitude={userPosition.latitude}>
          <div className="size-4.5 rounded-full border-2 border-white bg-[#4285F4] shadow-[0_0_0_6px_rgba(66,133,244,0.15),0_2px_6px_rgba(0,0,0,0.3)]" />
        </Marker>
      ) : null}

      {/* Center pin of the assessed point - only when it differs from the user's own location. */}
      {showRiskCenter && riskOverlay ? (
        <Marker longitude={riskOverlay.lng} latitude={riskOverlay.lat}>
          <div className="size-3.5 rounded-full border-2 border-white" style={{ backgroundColor: circleColor }} />
        </Marker>
      ) : null}

      {/* Highlight the tapped report location while its details overlay is open. */}
      {selectedPoint ? (
        <Marker longitude={selectedPoint.lng} latitude={selectedPoint.lat}>
          <div className="size-5 rounded-full border-2 border-primary bg-primary/25" />
        </Marker>
      ) : null}
    </>
  );
}
