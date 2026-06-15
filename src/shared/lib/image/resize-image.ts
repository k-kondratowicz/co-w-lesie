// Re-encoding through a canvas drops EXIF (including GPS), so an uploaded photo can't leak the
// reporter's exact location.
export async function resizeImage(file: File, maxDimension = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/webp', quality);
    });
  } finally {
    bitmap.close();
  }
}
