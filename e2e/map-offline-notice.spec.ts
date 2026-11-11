import { expect, openApp, test } from './fixtures';
import { resetData, seedBan, seedForest } from './utils/db';

test.beforeEach(async () => {
  await resetData();
  await seedForest();
  await seedBan();
});

test('an offline area without cached data says so instead of looking empty', async ({ page, context }) => {
  const bansLoaded = page.waitForResponse((response) => response.url().includes('/api/bans') && response.ok());
  await openApp(page);
  await bansLoaded;

  await context.setOffline(true);
  const canvas = page.locator('canvas.maplibregl-canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('map canvas not rendered');
  }

  // Far enough to leave the cached grid cells at the GPS zoom.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByRole('status').filter({ hasText: 'Brak danych offline dla tego obszaru' })).toBeVisible();
});
