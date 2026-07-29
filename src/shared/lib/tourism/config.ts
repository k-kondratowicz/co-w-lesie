// BDL "mapa turystyczna" ArcGIS REST endpoints. Layer IDs were confirmed by introspecting
// `<service>/MapServer/layers?f=json` - do not change without re-checking. A different service
// than shared/lib/bdl/config.ts (which serves the safety layers), same host and query dialect.

const TOURISM_BASE = 'https://mapserver.bdl.lasy.gov.pl/arcgis/rest/services/WFS_BDL_mapa_turystyczna/MapServer';

/** "Powierzchniowa baza noclegowa" - camping spots and camping fields (points). */
export const OVERNIGHT_BASE_LAYER = `${TOURISM_BASE}/1`;

/** "Powierzchniowe obiekty rekreacyjno-wypoczynkowe" - includes forest parking and vehicle stops. */
export const RECREATION_AREA_LAYER = `${TOURISM_BASE}/2`;

/** "Obszar programu Zanocuj w lesie" - polygons of the dispersed-camping programme. */
export const OVERNIGHT_ZONE_LAYER = `${TOURISM_BASE}/76`;

/**
 * BDL's `tur_obj_desc` values we import, per layer. Everything else in these layers (playgrounds,
 * rest spots, viewpoints) is out of scope, so the sync filters server-side instead of pulling
 * ~4000 rows we would drop anyway.
 */
export const PARKING_DESCRIPTIONS = ['Parkingi leśne', 'Miejsca postoju pojazdów'] as const;
export const CAMPING_DESCRIPTIONS = ['Miejsca biwakowania', 'Pola biwakowe'] as const;

/** ArcGIS `where` clause matching the given `tur_obj_desc` values. */
export function descriptionFilter(descriptions: readonly string[]): string {
  return `tur_obj_desc IN (${descriptions.map((value) => `'${value}'`).join(',')})`;
}
