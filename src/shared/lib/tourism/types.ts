import { z } from 'zod';

// Our own codes for BDL tourism point objects - stored in tourism_poi.kind and used as the
// /api/tourism filter. Independent of BDL's Polish descriptions, which are free text.
export const TOURISM_POI_KINDS = ['PARKING', 'VEHICLE_STOP', 'CAMP_SITE', 'CAMP_FIELD'] as const;

export type TourismPoiKind = (typeof TOURISM_POI_KINDS)[number];

export const tourismPoiKindSchema = z.enum(TOURISM_POI_KINDS);

/** Map layers group several kinds under one toggle (parking, overnight base). */
export const PARKING_KINDS: TourismPoiKind[] = ['PARKING', 'VEHICLE_STOP'];
export const CAMPING_KINDS: TourismPoiKind[] = ['CAMP_SITE', 'CAMP_FIELD'];
