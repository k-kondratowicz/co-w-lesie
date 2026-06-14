// Canonical site URL — single source of truth for metadata, sitemap and robots.
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.co-w-lesie.pl); falls back for local/dev.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.co-w-lesie.pl';
