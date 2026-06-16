import { describe, expect, it } from 'vitest';
import { formatDistance } from './format-distance';

describe('formatDistance', () => {
  it('uses metres below 1 km', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('uses km at and above 1 km, dropping the decimal for whole values', () => {
    expect(formatDistance(1000)).toBe('1 km');
    expect(formatDistance(5000)).toBe('5 km');
    expect(formatDistance(2500)).toBe('2.5 km');
    expect(formatDistance(1234)).toBe('1.2 km');
  });
});
