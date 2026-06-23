import { afterEach, describe, expect, it, vi } from 'vitest';
import { KMZB_FETCH_RETRIES } from './config';

const okResponse = () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ features: [], clusters: [] }) });

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchTileJson', () => {
  it('retries a transient failure then succeeds', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { fetchTileJson } = await import('./client');
    const data = await fetchTileJson('https://example.test/tile');

    expect(data).toEqual({ features: [], clusters: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting every attempt', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchTileJson } = await import('./client');

    await expect(fetchTileJson('https://example.test/tile')).rejects.toThrow('fetch failed');
    expect(fetchMock).toHaveBeenCalledTimes(KMZB_FETCH_RETRIES + 1);
  });
});
