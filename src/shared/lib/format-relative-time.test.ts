import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './format-relative-time';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it('formats minutes/hours/days in Polish', () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * MINUTE))).toMatch(/minut/);
    expect(formatRelativeTime(new Date(Date.now() - 2 * HOUR))).toMatch(/godzin/);
    expect(formatRelativeTime(new Date(Date.now() - 3 * DAY))).toMatch(/dni/);
  });

  it('accepts a Date, an ISO string, and a timestamp alike', () => {
    const twoHoursAgo = Date.now() - 2 * HOUR;

    expect(formatRelativeTime(new Date(twoHoursAgo))).toMatch(/godzin/);
    expect(formatRelativeTime(new Date(twoHoursAgo).toISOString())).toMatch(/godzin/);
    expect(formatRelativeTime(twoHoursAgo)).toMatch(/godzin/);
  });

  it('marks past times as "temu"', () => {
    expect(formatRelativeTime(new Date(Date.now() - 10 * MINUTE))).toContain('temu');
  });

  it('uses "za" for future times', () => {
    expect(formatRelativeTime(new Date(Date.now() + 2 * HOUR))).toMatch(/^za /);
  });

  it('collapses ~1 day ago to "wczoraj" (numeric: auto)', () => {
    expect(formatRelativeTime(new Date(Date.now() - DAY))).toBe('wczoraj');
  });

  it('shows "teraz" for the current moment', () => {
    expect(formatRelativeTime(Date.now())).toMatch(/teraz/);
  });
});
