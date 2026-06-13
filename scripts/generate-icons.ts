import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderIcon, renderOgImage } from '@/shared/lib/og-icon';

// Pre-renders the brand app icons + social share image to static files so they ship from
// /public (and src/app for the Apple touch and OG images) instead of being generated per request.
// Re-run after changing the pine mark or BRAND_COLOR: npm run generate:icons

const root = process.cwd();
const publicDir = join(root, 'public');
const appDir = join(root, 'src', 'app');

async function save(path: string, image: Response) {
  const buffer = Buffer.from(await image.arrayBuffer());
  await writeFile(path, buffer);
  console.log(`✓ ${path.replace(root, '.')} (${buffer.length} bytes)`);
}

async function main() {
  await save(join(publicDir, 'icon-192.png'), renderIcon(192));
  await save(join(publicDir, 'icon-512.png'), renderIcon(512));
  await save(join(publicDir, 'icon-maskable.png'), renderIcon(512, true));
  await save(join(appDir, 'apple-icon.png'), renderIcon(180, true));
  await save(join(appDir, 'opengraph-image.png'), renderOgImage());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
