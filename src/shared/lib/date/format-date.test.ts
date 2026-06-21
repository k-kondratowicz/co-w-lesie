import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './format-date';

describe('formatDate / formatDateTime', () => {
  const iso = '2026-06-16T09:30:00.000Z';

  it('formatDateTime includes a time, formatDate does not', () => {
    expect(formatDateTime(iso)).toMatch(/\d{1,2}:\d{2}/);
    expect(formatDate(iso)).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('accepts a string, timestamp, or Date', () => {
    expect(formatDate(new Date(iso))).toBe(formatDate(iso));
    expect(formatDate(new Date(iso).getTime())).toBe(formatDate(iso));
  });
});
