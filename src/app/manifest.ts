import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Co w lesie',
    short_name: 'Co w lesie',
    description: 'Mapa zgłoszeń i bezpieczeństwa w polskich lasach.',
    lang: 'pl',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#00786f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
