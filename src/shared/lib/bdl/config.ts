// BDL (Bank Danych o Lasach) ArcGIS REST endpoints. Layer IDs were confirmed by
// introspecting `<service>/MapServer/<id>?f=json` — do not change without re-checking.
// All queries pass outSR=4326 and let the server reproject from the native EPSG:2180.

export const BDL_BASE = 'https://mapserver.bdl.lasy.gov.pl/arcgis/rest/services';

/** "Strefy zagrożenia pożarowego" — fire-hazard forecast zones (small, ~60 features). */
export const FIRE_HAZARD_LAYER = `${BDL_BASE}/WMS_zagrozenie_pozarowe_w_lasach/MapServer/0`;

/** "Okresowy zakaz wstępu do lasu" — periodic forest entry bans (~700 features). */
export const ENTRY_BAN_LAYER = `${BDL_BASE}/WMS_zakazy_wstepu_do_lasu/MapServer/0`;

/**
 * Forest compartments ("Oddziały"): layer 3 = PGL LP, layer 4 = outside PGL LP.
 * Country-wide these are ~455k polygons, so seeding is bounded by a bbox (see seed script).
 */
export const FOREST_LAYERS = [`${BDL_BASE}/WMS_BDL/MapServer/3`, `${BDL_BASE}/WMS_BDL/MapServer/4`];
