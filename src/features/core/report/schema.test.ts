import { describe, expect, it } from 'vitest';
import { createReportSchema } from './schema';

const report = { type: 'FIRE', location: [19.94, 50.06] };

describe('createReportSchema imageKey', () => {
  it('accepts a staged pending/ key from the upload route', () => {
    expect(createReportSchema.safeParse({ ...report, imageKey: 'pending/0f2c-91ab.webp' }).success).toBe(true);
  });

  // An offline queue filled before photos were staged replays with the old key; rejecting it would drop the report.
  it('still accepts a reports/ key from an older offline queue', () => {
    expect(createReportSchema.safeParse({ ...report, imageKey: 'reports/0f2c-91ab.webp' }).success).toBe(true);
  });

  it('rejects a key outside both namespaces', () => {
    expect(createReportSchema.safeParse({ ...report, imageKey: 'other/0f2c-91ab.webp' }).success).toBe(false);
    expect(createReportSchema.safeParse({ ...report, imageKey: 'pending/../secret.webp' }).success).toBe(false);
  });
});
