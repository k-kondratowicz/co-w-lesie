import { describe, expect, it } from 'vitest';
import { banReason, fireCodeToDegree, fireUpdatedAt, isNoForecastCode, parseBdlDateTime } from './mappers';

describe('fireCodeToDegree', () => {
  it('maps valid hazard codes 0..3 to their degree', () => {
    expect(fireCodeToDegree('0')).toBe(0);
    expect(fireCodeToDegree('1')).toBe(1);
    expect(fireCodeToDegree('2')).toBe(2);
    expect(fireCodeToDegree('3')).toBe(3);
  });

  it('returns null for the not-forecast codes so the area reads UNKNOWN, not safe', () => {
    expect(fireCodeToDegree('-1')).toBeNull();
    expect(fireCodeToDegree('-2')).toBeNull();
  });

  it('returns null for out-of-range and non-numeric codes', () => {
    expect(fireCodeToDegree('4')).toBeNull();
    expect(fireCodeToDegree('')).toBeNull();
    expect(fireCodeToDegree('abc')).toBeNull();
  });

  it('rejects numeric prefixes and decimals instead of truncating them to a lower degree', () => {
    expect(fireCodeToDegree('0unknown')).toBeNull();
    expect(fireCodeToDegree('2.5')).toBeNull();
    expect(fireCodeToDegree('3x')).toBeNull();
    expect(fireCodeToDegree('03')).toBeNull();
    expect(fireCodeToDegree('+1')).toBeNull();
  });

  it('tolerates surrounding whitespace around an exact code', () => {
    expect(fireCodeToDegree(' 3 ')).toBe(3);
  });
});

describe('isNoForecastCode', () => {
  it('accepts the explicit not-covered and no-data codes', () => {
    expect(isNoForecastCode('-1')).toBe(true);
    expect(isNoForecastCode('-2')).toBe(true);
    expect(isNoForecastCode(' -2 ')).toBe(true);
  });

  it('rejects hazard degrees and unrecognised codes', () => {
    expect(isNoForecastCode('0')).toBe(false);
    expect(isNoForecastCode('3')).toBe(false);
    expect(isNoForecastCode('-3')).toBe(false);
    expect(isNoForecastCode('III')).toBe(false);
    expect(isNoForecastCode('')).toBe(false);
  });
});

describe('parseBdlDateTime', () => {
  it('parses the ISO-like format (YYYY-MM-DD HH:MM:SS) as Warsaw local time (winter, +01:00)', () => {
    expect(parseBdlDateTime('2025-03-13 07:52:07')?.toISOString()).toBe('2025-03-13T06:52:07.000Z');
  });

  it('parses the Polish format (DD-MM-YYYY HH:MM:SS) as Warsaw local time (winter, +01:00)', () => {
    expect(parseBdlDateTime('31-12-2026 00:00:00')?.toISOString()).toBe('2026-12-30T23:00:00.000Z');
  });

  it('reads an epoch date as the Warsaw wall clock, matching the old string format', () => {
    expect(parseBdlDateTime(Date.UTC(2026, 11, 31))?.toISOString()).toBe('2026-12-30T23:00:00.000Z');
    expect(parseBdlDateTime(Date.UTC(2026, 6, 15))?.toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  it('returns null for an epoch outside the representable date range', () => {
    expect(parseBdlDateTime(1e20)).toBeNull();
  });

  // Read as a real date, the sentinel would end an indefinite ban in year 1 and drop it from the map.
  it('returns null for the 0001-01-01 "no end date" sentinel', () => {
    expect(parseBdlDateTime(-62135596800000)).toBeNull();
  });

  it('returns null for empty or unparseable input', () => {
    expect(parseBdlDateTime(null)).toBeNull();
    expect(parseBdlDateTime(undefined)).toBeNull();
    expect(parseBdlDateTime('')).toBeNull();
    expect(parseBdlDateTime('13/03/2025')).toBeNull();
    expect(parseBdlDateTime('2025-13-40 99:99:99')).toBeNull();
  });
});

describe('fireUpdatedAt', () => {
  // The forecast hour is Polish local time; June is CEST (+02:00).
  it('combines the date and the hour', () => {
    expect(fireUpdatedAt('2026-06-10', '13')?.toISOString()).toBe('2026-06-10T11:00:00.000Z');
  });

  it('pads single-digit hours', () => {
    expect(fireUpdatedAt('2026-06-10', '7')?.toISOString()).toBe('2026-06-10T05:00:00.000Z');
  });

  it('falls back to midnight when the hour is invalid', () => {
    expect(fireUpdatedAt('2026-06-10', 'xx')?.toISOString()).toBe('2026-06-09T22:00:00.000Z');
  });
});

describe('banReason', () => {
  it('prefers the free-text opis over the coded kod', () => {
    expect(banReason('inne przyczyny', 'Prace leśne na terenie')).toBe('Prace leśne na terenie');
  });

  it('falls back to kod when opis is empty or null', () => {
    expect(banReason('inne przyczyny', null)).toBe('inne przyczyny');
    expect(banReason('inne przyczyny', '   ')).toBe('inne przyczyny');
  });

  it('returns null when both are missing', () => {
    expect(banReason(null, null)).toBeNull();
    expect(banReason('', '')).toBeNull();
  });
});
