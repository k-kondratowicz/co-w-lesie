import 'server-only';
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

function r2Client(): AwsClient {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    service: 's3',
    region: 'auto',
    retries: 2,
  });
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const response = await r2Client().fetch(r2Endpoint(key), {
    method: 'PUT',
    headers: {
      'content-type': contentType,
      // Next's patched fetch rebuilds the signed Request around its body stream, which loses the
      // length: without this header the PUT goes out chunked and R2 rejects it with 411.
      'content-length': String(body.byteLength),
    },
    body: body as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }
}

/** Server-side copy inside the bucket. Resolves false when the source object does not exist. */
export async function copyObject(fromKey: string, toKey: string): Promise<boolean> {
  const source = `${process.env.R2_BUCKET}/${fromKey}`.split('/').map(encodeURIComponent).join('/');
  const response = await r2Client().fetch(r2Endpoint(toKey), {
    method: 'PUT',
    headers: {
      'x-amz-copy-source': `/${source}`,
    },
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(`R2 copy failed (${response.status})`);
  }

  return true;
}
