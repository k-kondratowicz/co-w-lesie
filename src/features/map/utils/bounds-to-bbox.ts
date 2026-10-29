import type maplibregl from 'maplibre-gl';
import { type Bbox, formatBbox, snapBboxToGrid } from '@/shared/lib/geo/bbox';

export function boundsToBbox(map: maplibregl.Map): string {
  const bounds = map.getBounds();
  const viewport: Bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

  return formatBbox(snapBboxToGrid(viewport, map.getZoom()));
}
