import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

function originOf(url: string | undefined, fallback: string): string {
  try {
    return url ? new URL(url).origin : fallback;
  } catch {
    return fallback;
  }
}

// Origin that serves the forest PMTiles (R2), needed in img/connect CSP so map tiles load.
const pmtilesOrigin = originOf(process.env.NEXT_PUBLIC_FOREST_PMTILES_URL, 'https://*.r2.dev');
// Origin that serves report photos (R2 public bucket), needed in img-src to display them.
const photosOrigin = originOf(process.env.NEXT_PUBLIC_R2_PUBLIC_URL, 'https://*.r2.dev');

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next injects inline bootstrap/RSC scripts; dev also needs eval for HMR. Turnstile loads its
  // anti-bot script from challenges.cloudflare.com.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  // Turnstile renders its challenge inside an iframe from this origin.
  'frame-src https://challenges.cloudflare.com',
  // *.cartocdn.com serves the basemap style, glyphs, sprite and vector tiles; photos load from R2.
  `img-src 'self' data: blob: ${pmtilesOrigin} ${photosOrigin} https://*.cartocdn.com`,
  // Photo uploads go to our own /api (same-origin), so R2 needs no connect-src entry here.
  `connect-src 'self' ${pmtilesOrigin} https://*.cartocdn.com`,
  "worker-src 'self' blob:", // MapLibre runs its renderer in a blob worker
  "font-src 'self' data:",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The safety check needs geolocation; everything else stays off.
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  // sharp loads libvips via dlopen, which file tracing misses - force the linux binaries into the
  // upload route's function bundle. The globs no-op locally (those platform packages aren't installed).
  outputFileTracingIncludes: {
    '/api/reports/upload': ['./node_modules/@img/sharp-linux-x64/**/*', './node_modules/@img/sharp-libvips-linux-x64/**/*'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Route browser events through a same-origin path → no CSP change, dodges ad-blockers.
  tunnelRoute: '/monitoring',
});
