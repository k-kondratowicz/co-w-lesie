// Canonical site URL - single source of truth for metadata, sitemap and robots.
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://www.co-w-lesie.pl); falls back for local/dev.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.co-w-lesie.pl';

export const SITE_TITLE = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Co w lesie';

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  'Mapa zgłoszeń i bezpieczeństwa w polskich lasach. Sprawdź zagrożenie pożarowe i zakazy wstępu, zanim wejdziesz do lasu.';

export const SITE_DESCRIPTION_SHORT = process.env.NEXT_PUBLIC_SITE_DESCRIPTION_SHORT ?? SITE_DESCRIPTION;

// BRAND_COLOR should track --primary in globals.css; re-run `npm run generate:icons` after changing it.
export const SITE_BRAND_COLOR = '#00786f';
