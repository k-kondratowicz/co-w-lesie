import { describe, expect, it } from 'vitest';
import { DUPLICATE_BUFFER_MIN_METERS } from '@/features/saved-areas/constants';
import { duplicateBufferMeters, findDuplicateSavedArea } from '@/features/saved-areas/is-duplicate-area';
import type { SavedArea } from '@/features/saved-areas/types';

function area(overrides: Partial<SavedArea>): SavedArea {
  return {
    id: 'a1',
    name: null,
    lat: 50.06,
    lng: 19.94,
    radiusMeters: 5000,
    createdAt: '2026-06-23T00:00:00.000Z',
    ...overrides,
  };
}

describe('duplicateBufferMeters', () => {
  it('scales with the radius', () => {
    expect(duplicateBufferMeters(5000)).toBe(500);
  });

  it('floors at the minimum for small areas', () => {
    expect(duplicateBufferMeters(500)).toBe(DUPLICATE_BUFFER_MIN_METERS);
  });
});

describe('findDuplicateSavedArea', () => {
  const areas = [area({})];

  it('matches a jittered re-save of the same spot and radius', () => {
    expect(findDuplicateSavedArea(areas, { lat: 50.062, lng: 19.94 }, 5000)).toBeDefined();
  });

  it('ignores a different radius at the same spot', () => {
    expect(findDuplicateSavedArea(areas, { lat: 50.06, lng: 19.94 }, 8000)).toBeUndefined();
  });

  it('ignores a genuinely distant point', () => {
    expect(findDuplicateSavedArea(areas, { lat: 50.11, lng: 19.94 }, 5000)).toBeUndefined();
  });

  it('returns nothing when there are no saved areas', () => {
    expect(findDuplicateSavedArea([], { lat: 50.06, lng: 19.94 }, 5000)).toBeUndefined();
  });
});
