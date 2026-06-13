import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Origin that serves the forest PMTiles (R2), needed in img/connect CSP so map tiles load.
let pmtilesOrigin = 'https://*.r2.dev';
try {
  if (process.env.NEXT_PUBLIC_FOREST_PMTILES_URL) {
    pmtilesOrigin = new URL(process.env.NEXT_PUBLIC_FOREST_PMTILES_URL).origin;
  }
} catch {
  // keep the wildcard fallback
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next injects inline bootstrap/RSC scripts; dev also needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // *.cartocdn.com serves the basemap style, glyphs, sprite and vector tiles.
  `img-src 'self' data: blob: ${pmtilesOrigin} https://*.cartocdn.com`,
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
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
