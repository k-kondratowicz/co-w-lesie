import { ImageResponse } from 'next/og';
import { SITE_BRAND_COLOR } from '@/shared/lib/site';

// Shared brand mark for generated images (favicons, PWA icons, OG card).
// The pine matches src/app/icon.svg so every surface stays visually consistent.

export function pineDataUri(color = '#ffffff'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 4.5 L10 14.5 L22 14.5 Z" fill="${color}"/><path d="M16 10.5 L7 23 L25 23 Z" fill="${color}"/><rect x="14.5" y="22" width="3" height="5" rx="0.5" fill="${color}"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Renders a square app icon. maskable → full-bleed brand colour with extra safe-zone padding
// (Android adaptive icons + iOS home screen); otherwise a rounded tile for favicons/PWA.
export function renderIcon(size: number, maskable = false): ImageResponse {
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const inner = Math.round(size * (maskable ? 0.6 : 0.68));

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: SITE_BRAND_COLOR,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: rendered to PNG by satori (next/og), not the browser */}
      <img src={pineDataUri()} width={inner} height={inner} alt="" />
    </div>,
    { width: size, height: size },
  );
}

// Social share card: full-bleed brand colour with a large centred pine, no text.
export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: SITE_BRAND_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: rendered to PNG by satori (next/og), not the browser */}
      <img src={pineDataUri()} width={340} height={340} alt="" />
    </div>,
    { width: 1200, height: 630 },
  );
}
