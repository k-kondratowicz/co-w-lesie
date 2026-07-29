import { z } from 'zod';

// BDL fields can change without notice, so every response is validated before it touches the DB.
// `obj_id` is the layer's OID field (used for stable paging order), `nzw_ob` the object name.

export const tourismPoiProps = z.object({
  obj_id: z.number(),
  nzw_ob: z.string().nullable(),
  tur_obj_desc: z.string().nullable(),
});

export const overnightZoneProps = z.object({
  obj_id: z.number(),
  nzw_ob: z.string().nullable(),
});

export type TourismPoiProps = z.infer<typeof tourismPoiProps>;
export type OvernightZoneProps = z.infer<typeof overnightZoneProps>;
