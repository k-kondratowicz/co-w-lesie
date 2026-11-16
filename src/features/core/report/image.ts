// Report-image domain rules: how report photos are named, validated, and addressed. The R2
// transport that actually stores the bytes lives in shared/lib/r2 (putObject) - this file holds
// only the report-specific policy, so it stays pure and testable.

const ALLOWED_INPUT_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png']);
// sharp's names for the same three formats, sniffed from the bytes rather than trusted from the header.
const DECODABLE_FORMATS = new Set(['jpeg', 'png', 'webp']);

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_INPUT_TYPES.has(contentType);
}

export function isAllowedImageFormat(format: string): boolean {
  return DECODABLE_FORMATS.has(format);
}

export function isReportImageKey(key: string): boolean {
  return /^reports\/[a-f0-9-]+\.webp$/.test(key);
}

export function reportImageUrl(key: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  return key && base ? `${base.replace(/\/$/, '')}/${key}` : null;
}

// We always re-encode to WebP server-side, so stored keys are always .webp.
export function pendingImageKey(): string {
  return `pending/${crypto.randomUUID()}.webp`;
}

export function isPendingImageKey(key: string): boolean {
  return /^pending\/[a-f0-9-]+\.webp$/.test(key);
}

/** The key a staged photo gets once its report is saved. */
export function promotedImageKey(pendingKey: string): string {
  return pendingKey.replace(/^pending\//, 'reports/');
}
