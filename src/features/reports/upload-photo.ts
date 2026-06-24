import { reportsApi } from '@/features/core/report';
import { resizeImage } from '@/shared/lib/image/resize-image';

export async function uploadReportPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file);
  const { key } = await reportsApi.upload(blob);

  return key;
}
