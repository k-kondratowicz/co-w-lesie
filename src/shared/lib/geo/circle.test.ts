import { describe, expect, it } from 'vitest';
import { circlePolygon } from './circle';
import { distanceMeters } from './distance-meters';

const KRAKOW = { lng: 19.9445, lat: 50.0647 };

describe('circlePolygon', () => {
  it('is a closed Polygon ring with steps+1 points', () => {
    const polygon = circlePolygon(KRAKOW.lng, KRAKOW.lat, 5000, 64);
    expect(polygon.type).toBe('Polygon');

    const ring = polygon.coordinates[0];
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring[ring.length - 1]); // closed
  });

  it('honours a custom step count', () => {
    expect(circlePolygon(KRAKOW.lng, KRAKOW.lat, 1000, 8).coordinates[0]).toHaveLength(9);
  });

  it('places every vertex ~radius metres from the centre', () => {
    const radius = 5000;
    const ring = circlePolygon(KRAKOW.lng, KRAKOW.lat, radius, 32).coordinates[0];
    for (const [lng, lat] of ring) {
      expect(Math.abs(distanceMeters(KRAKOW.lng, KRAKOW.lat, lng, lat) - radius)).toBeLessThan(5);
    }
  });
});
