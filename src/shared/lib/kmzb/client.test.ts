import { afterEach, describe, expect, it, vi } from 'vitest';
import { KMZB_FETCH_RETRIES } from './config';

const okResponse = () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ features: [], clusters: [] }) });

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchTileJson', () => {
  it('retries a transient failure then succeeds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { fetchTileJson } = await import('./client');

    // Drive the exponential-backoff setTimeout instantly instead of waiting out the real delay.
    const promise = fetchTileJson('https://example.test/tile');
    await vi.runAllTimersAsync();
    const data = await promise;

    expect(data).toEqual({ features: [], clusters: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting every attempt', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchTileJson } = await import('./client');

    const promise = fetchTileJson('https://example.test/tile');
    const assertion = expect(promise).rejects.toThrow('fetch failed');
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(KMZB_FETCH_RETRIES + 1);
  });
});
