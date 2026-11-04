import type { Page } from '@playwright/test';
import { assessMyLocation, expect, fillReport, openApp, test } from './fixtures';
import { countReports, markFireAndBansSynced, resetData, seedFireZone, seedForest } from './utils/db';

test.beforeEach(async () => {
  await resetData();
});

async function submitReport(page: Page) {
  await openApp(page);
  const dialog = await fillReport(page, 'Strzały przy szlaku (E2E)');

  // Disabled until the Turnstile widget hands over a token.
  const submit = dialog.getByRole('button', { name: 'Zapisz' });
  await expect(submit).toBeEnabled();
  await submit.click();
}

test('saves a report placed in the forest', async ({ page }) => {
  await seedForest();

  await submitReport(page);

  await expect(page.getByText('Dziękujemy! Zgłoszenie zostało dodane.')).toBeVisible();
  await expect.poll(() => countReports('SHOTS')).toBe(1);
});

test('rejects a report away from any forest', async ({ page }) => {
  await submitReport(page);

  await expect(page.getByText('Zgłoszenia można dodawać tylko w lesie lub w jego pobliżu.')).toBeVisible();
  expect(await countReports()).toBe(0);
});

test('a saved report counts in the next safety assessment', async ({ page }) => {
  await seedForest();
  await seedFireZone(0);
  await markFireAndBansSynced();

  await submitReport(page);
  await expect(page.getByText('Dziękujemy! Zgłoszenie zostało dodane.')).toBeVisible();

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Zgłoszenia w pobliżu', { exact: true }).locator('..')).toHaveText(/^Zgłoszenia w pobliżu\s*1$/);
});
