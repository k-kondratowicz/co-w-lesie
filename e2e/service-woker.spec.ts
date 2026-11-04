import { expect, test } from './fixtures';

// Red until F2 lands (the service worker saves whichever page was opened last as the app shell).
test.fail('offline start opens the app even after visiting another page', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  await page.goto('/polityka-prywatnosci');
  await context.setOffline(true);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Czy mogę iść do lasu?' })).toBeVisible();
});
