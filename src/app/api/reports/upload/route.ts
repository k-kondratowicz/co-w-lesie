import sharp from 'sharp';
import { clientIp } from '@/shared/lib/client-ip';
import { isAllowedImageType, isR2Configured, putReportImage, reportImageKey } from '@/shared/lib/r2';
import { checkRateLimit } from '@/shared/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_LIMIT = 10; // uploads per IP
const UPLOAD_WINDOW_MS = 60_000; // per minute
const MAX_UPLOAD_BYTES = 4_000_000; // raw bytes accepted before re-encoding (Vercel caps ~4.5 MB)
const MAX_DIMENSION = 1600;

// POST /api/reports/upload — accept one image, re-encode it to WebP (which strips EXIF/GPS and
// caps dimensions server-side, so this can't be bypassed by a crafted client), store it on R2.
export async function POST(request: Request) {
  if (!isR2Configured()) {
    return Response.json({ error: 'Przesyłanie zdjęć jest niedostępne.' }, { status: 503 });
  }

  const limit = await checkRateLimit(`upload:${clientIp(request)}`, UPLOAD_LIMIT, UPLOAD_WINDOW_MS);

  if (!limit.ok) {
    return Response.json(
      { error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  if (!isAllowedImageType(request.headers.get('content-type') ?? '')) {
    return Response.json({ error: 'Nieobsługiwany format zdjęcia.' }, { status: 400 });
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'Zdjęcie jest zbyt duże.' }, { status: 413 });
  }

  const input = new Uint8Array(await request.arrayBuffer());

  if (input.byteLength === 0) {
    return Response.json({ error: 'Puste zdjęcie.' }, { status: 400 });
  }

  if (input.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'Zdjęcie jest zbyt duże.' }, { status: 413 });
  }

  let webp: Buffer;

  try {
    // rotate() applies the EXIF orientation, then the re-encode drops all metadata.
    webp = await sharp(input)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return Response.json({ error: 'Nieprawidłowy plik zdjęcia.' }, { status: 400 });
  }

  const key = reportImageKey();

  try {
    await putReportImage(key, webp, 'image/webp');
  } catch (error) {
    console.error('[POST /api/reports/upload] R2 upload failed', error);

    return Response.json({ error: 'Nie udało się przesłać zdjęcia.' }, { status: 500 });
  }

  return Response.json({ key });
}
