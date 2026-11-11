import { describe, expect, it } from 'vitest';
import { isLayerUnavailable, type LayerQueryState } from './layer-availability';

const loaded: LayerQueryState = {
  fetchStatus: 'idle',
  isPending: false,
  isPlaceholderData: false,
  isLoadingError: false,
};

describe('isLayerUnavailable', () => {
  it('flags an offline viewport with nothing cached', () => {
    expect(isLayerUnavailable({ ...loaded, fetchStatus: 'paused', isPending: true })).toBe(true);
  });

  it('flags an offline viewport that only shows the previous viewport', () => {
    expect(isLayerUnavailable({ ...loaded, fetchStatus: 'paused', isPlaceholderData: true })).toBe(true);
  });

  it('flags a first fetch that failed', () => {
    expect(isLayerUnavailable({ ...loaded, isLoadingError: true })).toBe(true);
  });

  it('accepts a cached result for this viewport while offline', () => {
    expect(isLayerUnavailable({ ...loaded, fetchStatus: 'paused' })).toBe(false);
  });

  it('accepts the previous viewport while the new one is still loading online', () => {
    expect(isLayerUnavailable({ ...loaded, fetchStatus: 'fetching', isPlaceholderData: true })).toBe(false);
  });

  it('accepts a loaded layer', () => {
    expect(isLayerUnavailable(loaded)).toBe(false);
  });
});
