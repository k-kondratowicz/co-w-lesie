import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyObject, putObject } from './r2';

const sent: Request[] = [];

function respondWith(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      sent.push(request);

      return new Response(null, { status });
    }),
  );
}

beforeEach(() => {
  sent.length = 0;
  vi.stubEnv('R2_ACCOUNT_ID', 'acct');
  vi.stubEnv('R2_ACCESS_KEY_ID', 'access-key');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret-key');
  vi.stubEnv('R2_BUCKET', 'report-photos');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('putObject', () => {
  // Without an explicit length Next's fetch sends the PUT chunked, and R2 answers 411.
  it('sends Content-Length with the bytes', async () => {
    respondWith(200);

    await putObject('pending/a.webp', new Uint8Array(1234), 'image/webp');

    expect(sent[0].headers.get('content-length')).toBe('1234');
  });

  it('throws on a non-2xx response', async () => {
    respondWith(403);

    await expect(putObject('pending/a.webp', new Uint8Array(1), 'image/webp')).rejects.toThrow('403');
  });
});

describe('copyObject', () => {
  it('copies from the source key into the target key', async () => {
    respondWith(200);

    expect(await copyObject('pending/a.webp', 'reports/a.webp')).toBe(true);
    expect(sent[0].url).toBe('https://acct.r2.cloudflarestorage.com/report-photos/reports/a.webp');
    expect(sent[0].headers.get('x-amz-copy-source')).toBe('/report-photos/pending/a.webp');
  });

  it('URL-encodes the source key but keeps its slashes', async () => {
    respondWith(200);

    await copyObject('pending/a b+c.webp', 'reports/x.webp');

    expect(sent[0].headers.get('x-amz-copy-source')).toBe('/report-photos/pending/a%20b%2Bc.webp');
  });

  it('resolves false when the source object does not exist', async () => {
    respondWith(404);

    expect(await copyObject('pending/a.webp', 'reports/a.webp')).toBe(false);
  });

  it('throws on any other failure', async () => {
    respondWith(403);

    await expect(copyObject('pending/a.webp', 'reports/a.webp')).rejects.toThrow('403');
  });
});
