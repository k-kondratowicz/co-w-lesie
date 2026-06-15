import { resizeImage } from '@/shared/lib/image/resize-image';

export async function uploadReportPhoto(file: File): Promise<string> {
  // Resize client-side to keep the upload small; the server re-encodes again to strip EXIF.
  const blob = await resizeImage(file);

  const response = await fetch('/api/reports/upload', {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });

  if (!response.ok) {
    throw new Error('Nie udało się przesłać zdjęcia.');
  }

  const { key } = (await response.json()) as { key: string };

  return key;
}
