import { api } from '@/shared/lib/api/client';
import { resizeImage } from '@/shared/lib/image/resize-image';

export async function uploadReportPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file);
  const { key } = await api.reports.upload(blob);

  return key;
}
