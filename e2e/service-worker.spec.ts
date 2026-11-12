import type { Page } from '@playwright/test';
import { expect, openApp, test } from './fixtures';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// The buttons are server-rendered, so a visible button proves nothing offline - the map canvas and a
// dialog that opens on click show the cached JS actually ran. The assessment itself is not checked:
// a page opened under Playwright's offline emulation still reports navigator.onLine as true.
async function expectWorkingOfflineStart(page: Page) {
  await openApp(page);
  await page.getByRole('button', { name: 'Czy mogę iść do lasu?' }).click();
  await expect(page.getByRole('dialog', { name: 'Czy mogę dziś bezpiecznie iść do lasu?' })).toBeVisible();
}

test('offline start opens the app even after visiting another page', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await openApp(page);

  await page.goto('/polityka-prywatnosci');
  await context.setOffline(true);

  await expectWorkingOfflineStart(page);
});

test('offline start works right after the first visit', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first load ran before the worker took over; it learns about those files from the page.
  await expect
    .poll(() =>
      page.evaluate(async (style) => {
        const staticPrefix = `${window.location.origin}/_next/static/`;
        const urls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(staticPrefix));
        const stored = await Promise.all([...urls, style].map((url) => caches.match(url)));

        return stored.every(Boolean);
      }, MAP_STYLE),
    )
    .toBe(true);

  await context.setOffline(true);

  await expectWorkingOfflineStart(page);
});
