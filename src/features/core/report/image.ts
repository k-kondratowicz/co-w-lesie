// Report-image domain rules: how report photos are named, validated, and addressed. The R2
// transport that actually stores the bytes lives in shared/lib/r2 (putObject) - this file holds
// only the report-specific policy, so it stays pure and testable.

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
