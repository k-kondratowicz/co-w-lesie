import { ReportType } from '@prisma/client';
import { z } from 'zod';
import { isWithinBbox, POLAND_BBOX } from '@/shared/lib/geo/bbox';

export const MAX_DESCRIPTION_LENGTH = 1000;

// How far a report's location may be nudged from the reporter's GPS position (client guard,
// so people place a report near what they saw without reporting somewhere far away).
export const REPORT_MAX_OFFSET_METERS = 2000;

// Coordinates follow the GeoJSON convention everywhere: [lng, lat].
export const locationSchema = z
  .tuple([z.number(), z.number()], 'Lokalizacja musi zawierać współrzędne GPS (długość i szerokość geograficzną)')
  .refine(([lng, lat]) => isWithinBbox(POLAND_BBOX, lng, lat), 'Lokalizacja znajduje się poza granicami Polski');

export const createReportSchema = z.object({
  type: z.enum(ReportType, 'Wybierz typ zgłoszenia'),
  location: locationSchema,
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION_LENGTH, `Opis może mieć maksymalnie ${MAX_DESCRIPTION_LENGTH} znaków`)
    .optional(),
  // R2 object key of an already-uploaded photo, in our reports/ namespace (always re-encoded to webp).
  imageKey: z
    .string()
    .regex(/^reports\/[a-f0-9-]+\.webp$/, 'Nieprawidłowy klucz zdjęcia')
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
