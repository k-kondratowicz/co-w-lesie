import { AwsClient } from 'aws4fetch';

// Server-only R2 object-storage transport. Credentials never reach the client - the browser
// uploads to our API, which stores objects here. Domain-specific key/URL/validation rules live in
// the feature that owns the objects (e.g. features/reports/image.ts), not in this infra layer.

function r2Endpoint(key: string): string {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET,
  );
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    service: 's3',
    region: 'auto',
  });

  const signed = await client.sign(r2Endpoint(key), {
    method: 'PUT',
    body: body as BodyInit,
    headers: { 'content-type': contentType },
  });

  // Not client.fetch: Next's patched fetch rebuilds a Request input around its body stream, the PUT
  // goes out chunked without Content-Length, and R2 rejects it with 411. Raw bytes keep the length.
  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: body as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }
}
