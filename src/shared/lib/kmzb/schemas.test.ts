import { describe, expect, it } from 'vitest';
import { kmzbFeatureSchema, kmzbResponseSchema } from './schemas';

describe('kmzbFeatureSchema', () => {
  const validAttributes = {
    OBJECTID: 1,
    Status: 'Nowe',
    Typ: 'Wypalanie traw',
    'Data utworzenia': 1_750_000_000_000,
  };

  it('accepts a feature with point geometry', () => {
    const parsed = kmzbFeatureSchema.safeParse({ attributes: validAttributes, geometry: { x: 567_000, y: 243_000 } });

    expect(parsed.success).toBe(true);
  });

  it('accepts a cluster response (null geometry) so the caller can subdivide instead of inserting', () => {
    const parsed = kmzbFeatureSchema.safeParse({ attributes: validAttributes, geometry: null });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.geometry).toBeNull();
  });

  it('rejects a feature missing the required id so malformed rows are skipped, not trusted', () => {
    const { OBJECTID, ...withoutId } = validAttributes;
    const parsed = kmzbFeatureSchema.safeParse({ attributes: withoutId, geometry: { x: 1, y: 2 } });

    expect(parsed.success).toBe(false);
  });
});

describe('kmzbResponseSchema', () => {
  it('validates the envelope with features and clusters arrays', () => {
    expect(kmzbResponseSchema.safeParse({ features: [], clusters: [] }).success).toBe(true);
  });

  it('rejects a response missing the clusters array (subdivision signal)', () => {
    expect(kmzbResponseSchema.safeParse({ features: [] }).success).toBe(false);
  });
});
