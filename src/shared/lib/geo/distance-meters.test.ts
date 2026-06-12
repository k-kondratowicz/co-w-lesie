import { describe, expect, it } from 'vitest';
import { distanceMeters } from './distance-meters';

describe('distanceMeters', () => {
  it('is 0 for identical points', () => {
    expect(distanceMeters(19.9445, 50.0647, 19.9445, 50.0647)).toBe(0);
  });

  it('measures ~111 m per 0.001° of latitude', () => {
    expect(distanceMeters(20, 50, 20, 50.001)).toBeCloseTo(111, 0);
  });

  it('matches the known Kraków–Warsaw distance (~252 km)', () => {
    const km = distanceMeters(19.9445, 50.0647, 21.0122, 52.2297) / 1000;
    expect(km).toBeGreaterThan(245);
    expect(km).toBeLessThan(260);
  });
});
