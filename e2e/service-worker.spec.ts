import { expect, test } from './fixtures';

// Known bug: the service worker saves the last opened page as the offline shell, so after visiting
// the privacy policy an offline start opens that page instead of the map. test.fail until fixed.
test.fail('offline start opens the app even after visiting another page', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  await page.goto('/polityka-prywatnosci');
  await context.setOffline(true);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Czy mogę iść do lasu?' })).toBeVisible();
});
