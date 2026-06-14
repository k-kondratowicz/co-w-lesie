import type { MetadataRoute } from 'next';
import { SITE_BRAND_COLOR, SITE_DESCRIPTION_SHORT, SITE_TITLE } from '@/shared/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_TITLE,
    description: SITE_DESCRIPTION_SHORT,
    lang: 'pl',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: SITE_BRAND_COLOR,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
