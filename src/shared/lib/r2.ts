import { AwsClient } from 'aws4fetch';

// Server-only: the R2 credentials never reach the client. The browser uploads to our API, which
// re-encodes the image (stripping EXIF) and stores it here.

const ALLOWED_INPUT_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png']);

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_INPUT_TYPES.has(contentType);
}

export function isReportImageKey(key: string): boolean {
  return /^reports\/[a-f0-9-]+\.webp$/.test(key);
}

// We always re-encode to WebP server-side, so stored keys are always .webp.
export function reportImageKey(): string {
  return `reports/${crypto.randomUUID()}.webp`;
}

export function reportImageUrl(key: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  return key && base ? `${base.replace(/\/$/, '')}/${key}` : null;
}

function r2Endpoint(key: string): string {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET,
  );
}

export async function putReportImage(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    service: 's3',
    region: 'auto',
  });

  const response = await client.fetch(r2Endpoint(key), {
    method: 'PUT',
    body: body as BodyInit,
    headers: { 'content-type': contentType },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }
}
