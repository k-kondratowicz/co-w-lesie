// KMZB (Krajowa Mapa Zagrozen Bezpieczenstwa) ingestion tunables. The iMapLite endpoint is
// undocumented and unofficial - keep every magic value here, validate every response (schemas.ts),
// and treat a sync failure as UNKNOWN, never "safe".

export const KMZB_BASE_URL =
  'https://mapy.geoportal.gov.pl/iMapLite/imlDataService/service/data/clust/get/4028e4e54e6ceb84014e6ced4d1c0000/4028e4e54e6ceb84014e6ced4d230001';

// Poland bounds in EPSG:2180 (the service's native CRS), tiled because it returns clusters
// instead of features above ~4k points in a bbox - we subdivide until it yields raw features.
export const KMZB_PL_BBOX = { minX: 100_000, minY: 100_000, maxX: 900_000, maxY: 900_000 } as const;
export const KMZB_TILE_SIZE = 200_000;
export const KMZB_MAX_SUBDIVIDE_DEPTH = 4;

// Only forest-relevant incident types (backlog "Data sources"). These strings are sent verbatim
// to the API's filter, so they MUST keep their exact Polish diacritics - do not ASCII-fold them.
export const KMZB_TYPES = [
  'Kłusownictwo',
  'Nielegalna wycinka drzew',
  'Niszczenie zieleni',
  'Wypalanie traw',
  'Zdarzenia drogowe z udziałem zwierząt leśnych',
  'Poruszanie się po terenach leśnych quadami',
  'Dzikie wysypiska śmieci',
] as const;

// Police workflow statuses kept (drops rejected/closed-as-false). Sent verbatim to the API filter.
export const KMZB_STATUSES = ['Weryfikacja', 'Potwierdzone', 'Potwierdzone (przekazane poza Policję)', 'Nowe'] as const;

// Rolling window of incidents to ingest, counted back from the moment of each sync. Only the last
// week is relevant for "is it safe right now" - older police reports add noise without current value.
export const KMZB_SINCE_DAYS = 7;

// KMZB points are imprecise, so we keep a tight buffer to forests on import rather than a strict
// in-polygon test. Matches the exploration that produced kmzb-forest-reports.csv.
export const KMZB_FOREST_BUFFER_METERS = 10;

// The two incident types that signal real danger to a person in the forest. They drive a
// cautionary advisory in the safety assistant (call the police if you see them) - deliberately
// NOT folded into the GREEN/YELLOW/RED score: the data is imprecise/historical and most KMZB
// volume (quads, dumping) is nuisance, so scoring it would cry wolf. The rest stay map-only.
export const KMZB_TYPE_POACHING = 'Kłusownictwo';
export const KMZB_TYPE_GRASS_BURNING = 'Wypalanie traw';
export const KMZB_ADVISORY_TYPES = [KMZB_TYPE_POACHING, KMZB_TYPE_GRASS_BURNING] as const;
