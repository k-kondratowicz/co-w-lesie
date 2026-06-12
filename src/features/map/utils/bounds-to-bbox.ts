import type maplibregl from 'maplibre-gl';

export function boundsToBbox(map: maplibregl.Map): string {
  const bounds = map.getBounds();
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(',');
}
