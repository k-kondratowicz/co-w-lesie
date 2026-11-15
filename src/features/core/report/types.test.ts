import { ReportType as PrismaReportType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { REPORT_TYPES } from './types';

describe('REPORT_TYPES', () => {
  // A new enum value added only in Prisma would be silently unselectable in the form.
  it('lists exactly the values of the Prisma enum, in the same order', () => {
    expect([...REPORT_TYPES]).toEqual(Object.values(PrismaReportType));
  });
});
