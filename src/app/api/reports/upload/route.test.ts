import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { isReportImageKey } from '@/features/core/report';
import { POST } from './route';

const ORIGINAL_ENV = { ...process.env };
const MAX_UPLOAD_BYTES = 4_000_000;

let ipCounter = 0;

async function solidImage(format: 'jpeg' | 'png' | 'webp', width = 10, height = 10): Promise<Uint8Array<ArrayBuffer>> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#2e7d32',
    },
  })
    .toFormat(format)
    .toBuffer();

  return new Uint8Array(buffer);
}

function uploadRequest(contentType: string, body: BodyInit) {
  ipCounter += 1;

  return new Request('http://localhost/api/reports/upload', {
    method: 'POST',
    headers: { 'content-type': contentType, 'x-forwarded-for': `9.9.9.${ipCounter}` },
    body,
  });
}

vi.mock('@/shared/lib/r2', () => ({
  isR2Configured: () => Boolean(process.env.R2_BUCKET),
  putObject: vi.fn().mockResolvedValue(undefined),
}));

describe('POST /api/reports/upload', () => {
  it('returns 503 when R2 is not configured', async () => {
    // Unset, not `= undefined` — process.env coerces values to the string "undefined" (truthy).
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;

    const response = await POST(uploadRequest('image/webp', 'x'));

    expect(response.status).toBe(503);
  });

  describe('when configured', () => {
    beforeAll(() => {
      process.env.R2_ACCOUNT_ID = 'acct';
      process.env.R2_ACCESS_KEY_ID = 'access-key';
      process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
      process.env.R2_BUCKET = 'report-photos';
    });

    afterAll(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    it('rejects an unsupported content type with 400 (before any processing)', async () => {
      const response = await POST(uploadRequest('image/gif', 'x'));

      expect(response.status).toBe(400);
    });

    it('rejects an oversized image with 413', async () => {
      const response = await POST(uploadRequest('image/webp', new Uint8Array(MAX_UPLOAD_BYTES + 1)));

      expect(response.status).toBe(413);
    });

    it('rejects an SVG sent with an image/png content type', async () => {
      const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

      const response = await POST(uploadRequest('image/png', svg));

      expect(response.status).toBe(400);
    });

    it.each([
      ['image/jpeg', 'jpeg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ] as const)('stores a real %s photo and returns its key', async (contentType, format) => {
      const response = await POST(uploadRequest(contentType, await solidImage(format)));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(isReportImageKey(body.key)).toBe(true);
    });

    it('rejects an image above the pixel limit even when the file is small', async () => {
      // Solid colour compresses to ~160 KB, well under MAX_UPLOAD_BYTES, yet decodes to 56 MP.
      const response = await POST(uploadRequest('image/png', await solidImage('png', 8000, 7000)));

      expect(response.status).toBe(400);
    });
  });
});
