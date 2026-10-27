import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { fetchAllFeatures, type QueryOptions } from './client';

const props = z.object({ objectid: z.number() });
const options: QueryOptions = { outFields: ['objectid'], orderByField: 'objectid', nullGeometry: 'reject' };

function feature(objectid: number) {
  return { type: 'Feature', properties: { objectid }, geometry: { type: 'Point', coordinates: [20, 50] } };
}

function page(objectids: number[], extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ type: 'FeatureCollection', features: objectids.map(feature), ...extra }),
  };
}

function requestedOffsets(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('resultOffset') ?? '');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAllFeatures paging', () => {
  // Stopping at the first short page would store a partial ban set as if it were complete.
  it('keeps paging past a short page while the server reports exceededTransferLimit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], { exceededTransferLimit: true }))
      .mockResolvedValueOnce(page([3], { properties: { exceededTransferLimit: true } }))
      .mockResolvedValueOnce(page([4], { exceededTransferLimit: false }));
    vi.stubGlobal('fetch', fetchMock);

    const features = await fetchAllFeatures('https://example.test/layer', props, options);

    expect(features.map((item) => item.properties.objectid)).toEqual([1, 2, 3, 4]);
    expect(requestedOffsets(fetchMock)).toEqual(['0', '2', '3']);
  });

  it('stops when the server says the layer is exhausted, even on a full page', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => index);
    const fetchMock = vi.fn().mockResolvedValueOnce(page(fullPage, { exceededTransferLimit: false }));
    vi.stubGlobal('fetch', fetchMock);

    const features = await fetchAllFeatures('https://example.test/layer', props, options);

    expect(features).toHaveLength(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to "a full page means more" when the server omits the flag', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => index);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page(fullPage))
      .mockResolvedValueOnce(page([1000]));
    vi.stubGlobal('fetch', fetchMock);

    const features = await fetchAllFeatures('https://example.test/layer', props, options);

    expect(features).toHaveLength(1001);
    expect(requestedOffsets(fetchMock)).toEqual(['0', '1000']);
  });

  it('rejects an empty page that still reports more results instead of returning the pages so far', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], { exceededTransferLimit: true }))
      .mockResolvedValueOnce(page([], { exceededTransferLimit: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAllFeatures('https://example.test/layer', props, options)).rejects.toThrow(
      'empty but reported more results',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ends cleanly on an empty last page when the server says it is done', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], { exceededTransferLimit: true }))
      .mockResolvedValueOnce(page([], { exceededTransferLimit: false }));
    vi.stubGlobal('fetch', fetchMock);

    const features = await fetchAllFeatures('https://example.test/layer', props, options);

    expect(features).toHaveLength(2);
  });

  it('fails the sync on an HTTP error instead of returning what it has', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' }));

    await expect(fetchAllFeatures('https://example.test/layer', props, options)).rejects.toThrow('BDL query failed (503');
  });
});

describe('fetchAllFeatures null geometry', () => {
  function mixedPage() {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        type: 'FeatureCollection',
        features: [feature(1), { type: 'Feature', properties: { objectid: 2 }, geometry: null }],
        exceededTransferLimit: false,
      }),
    };
  }

  it('rejects a layer mixing valid and null-geometry rows when it must be complete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mixedPage()));

    await expect(fetchAllFeatures('https://example.test/layer', props, options)).rejects.toThrow('1 feature(s) without geometry');
  });

  it('skips null-geometry rows for layers that opt in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mixedPage()));

    const features = await fetchAllFeatures('https://example.test/layer', props, { ...options, nullGeometry: 'skip' });

    expect(features.map((item) => item.properties.objectid)).toEqual([1]);
  });
});
