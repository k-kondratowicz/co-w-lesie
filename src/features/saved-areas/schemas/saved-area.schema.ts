import { z } from 'zod';
import { locationSchema } from '@/features/reports/schemas/create-report.schema';
import { MAX_AREA_NAME_LENGTH, MAX_AREA_RADIUS_METERS, MIN_AREA_RADIUS_METERS } from '@/features/saved-areas/constants';

export const createSavedAreaSchema = z.object({
  location: locationSchema,
  radiusMeters: z.number().int().min(MIN_AREA_RADIUS_METERS).max(MAX_AREA_RADIUS_METERS),
  name: z.string().trim().max(MAX_AREA_NAME_LENGTH, `Nazwa może mieć maksymalnie ${MAX_AREA_NAME_LENGTH} znaków`).optional(),
});

export const renameSavedAreaSchema = z.object({
  name: z.string().trim().max(MAX_AREA_NAME_LENGTH, `Nazwa może mieć maksymalnie ${MAX_AREA_NAME_LENGTH} znaków`).nullable(),
});

export type CreateSavedAreaInput = z.infer<typeof createSavedAreaSchema>;
export type RenameSavedAreaInput = z.infer<typeof renameSavedAreaSchema>;
