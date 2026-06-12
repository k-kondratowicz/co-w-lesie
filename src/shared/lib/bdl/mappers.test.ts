import { describe, expect, it } from 'vitest';
import { banReason, fireKodToDegree, fireUpdatedAt, parseBdlDateTime } from './mappers';

describe('fireKodToDegree', () => {
  it('maps valid hazard codes 0..3 to their degree', () => {
    expect(fireKodToDegree('0')).toBe(0);
    expect(fireKodToDegree('1')).toBe(1);
    expect(fireKodToDegree('2')).toBe(2);
    expect(fireKodToDegree('3')).toBe(3);
  });

  it('returns null for the not-forecast code so the area reads UNKNOWN, not safe', () => {
    expect(fireKodToDegree('-1')).toBeNull();
  });

  it('returns null for out-of-range and non-numeric codes', () => {
    expect(fireKodToDegree('4')).toBeNull();
    expect(fireKodToDegree('')).toBeNull();
    expect(fireKodToDegree('abc')).toBeNull();
  });
});

describe('parseBdlDateTime', () => {
  it('parses the ISO-like format (YYYY-MM-DD HH:MM:SS) as UTC', () => {
    expect(parseBdlDateTime('2025-03-13 07:52:07')?.toISOString()).toBe('2025-03-13T07:52:07.000Z');
  });

  it('parses the Polish format (DD-MM-YYYY HH:MM:SS) as UTC', () => {
    expect(parseBdlDateTime('31-12-2026 00:00:00')?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
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
  it('combines the date and the hour', () => {
    expect(fireUpdatedAt('2026-06-10', '13')?.toISOString()).toBe('2026-06-10T13:00:00.000Z');
  });

  it('pads single-digit hours', () => {
    expect(fireUpdatedAt('2026-06-10', '7')?.toISOString()).toBe('2026-06-10T07:00:00.000Z');
  });

  it('falls back to midnight when the hour is invalid', () => {
    expect(fireUpdatedAt('2026-06-10', 'xx')?.toISOString()).toBe('2026-06-10T00:00:00.000Z');
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
