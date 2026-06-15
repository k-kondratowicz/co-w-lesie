import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from './route';

const ORIGINAL_ENV = { ...process.env };
const MAX_UPLOAD_BYTES = 4_000_000;

let ipCounter = 0;

function uploadRequest(contentType: string, body: BodyInit) {
  ipCounter += 1;

  return new Request('http://localhost/api/reports/upload', {
    method: 'POST',
    headers: { 'content-type': contentType, 'x-forwarded-for': `9.9.9.${ipCounter}` },
    body,
  });
}

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
  });
});
