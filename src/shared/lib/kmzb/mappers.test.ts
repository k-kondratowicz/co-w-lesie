import { describe, expect, it } from 'vitest';
import { kmzbMsToDate, toKmzbRow } from './mappers';
import type { KmzbPointFeature } from './schemas';

describe('kmzbMsToDate', () => {
  it('converts an epoch-millis timestamp to a Date', () => {
    expect(kmzbMsToDate(1_750_000_000_000)?.toISOString()).toBe(new Date(1_750_000_000_000).toISOString());
  });

  it('returns null for null, undefined and 0 (no event date)', () => {
    expect(kmzbMsToDate(null)).toBeNull();
    expect(kmzbMsToDate(undefined)).toBeNull();
    expect(kmzbMsToDate(0)).toBeNull();
  });
});

describe('toKmzbRow', () => {
  function feature(overrides: Partial<KmzbPointFeature['attributes']> = {}): KmzbPointFeature {
    return {
      attributes: {
        OBJECTID: 123,
        Status: 'Potwierdzone',
        Typ: 'Kłusownictwo',
        TERYT: '1261011',
        'Data utworzenia': 1_750_000_000_000,
        'Data zdarzenia': 1_749_000_000_000,
        ...overrides,
      },
      // EPSG:2180 easting/northing - carried through; PostGIS reprojects on insert.
      geometry: { x: 567_000, y: 243_000 },
    };
  }

  it('maps a feature to a row with a string id and the raw 2180 coordinates', () => {
    const row = toKmzbRow(feature());

    expect(row.id).toBe('123');
    expect(row.type).toBe('Kłusownictwo');
    expect(row.status).toBe('Potwierdzone');
    expect(row.teryt).toBe('1261011');
    expect(row.createdAt.toISOString()).toBe(new Date(1_750_000_000_000).toISOString());
    expect(row.eventAt?.toISOString()).toBe(new Date(1_749_000_000_000).toISOString());
    expect(row.x).toBe(567_000);
    expect(row.y).toBe(243_000);
  });

  it('keeps eventAt and teryt null when absent', () => {
    const row = toKmzbRow(feature({ 'Data zdarzenia': null, TERYT: null }));

    expect(row.eventAt).toBeNull();
    expect(row.teryt).toBeNull();
  });
});
