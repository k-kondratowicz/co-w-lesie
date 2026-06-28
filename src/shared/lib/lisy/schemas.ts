import { z } from 'zod';
import { VOIVODESHIPS } from './config';

// A parsed schedule row, re-validated before it reaches the database. The scraper already checks
// these, but the sync is the trust boundary for an unofficial, hand-edited HTML source: a future
// page change must fail validation here rather than write a malformed campaign.

const isoDate = z.iso.date();

export const scheduleRowSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    voivodeship: z.string().refine((name) => VOIVODESHIPS.has(name), { message: 'unknown voivodeship' }),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine((row) => row.startDate <= row.endDate, { message: 'startDate after endDate' });

export type ValidatedScheduleRow = z.infer<typeof scheduleRowSchema>;
