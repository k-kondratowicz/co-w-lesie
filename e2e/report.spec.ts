import type { Page } from '@playwright/test';
import { assessMyLocation, expect, openApp, test } from './fixtures';
import { countReports, markFireAndBansSynced, resetData, seedFireZone, seedForest } from './utils/db';

test.beforeEach(async () => {
  await resetData();
});

async function submitDumpReport(page: Page) {
  await openApp(page);
  await page.getByRole('button', { name: 'Dodaj zgłoszenie' }).click();

  const dialog = page.getByRole('dialog', { name: /^Zgłoś sytuację w lesie/ });

  // The map may already have a GPS fix that pre-fills the field ("Odśwież") or not yet ("Pobierz").
  await dialog.getByRole('button', { name: /^(Pobierz|Odśwież) lokalizację$/ }).click();
  await expect(dialog.getByLabel('Szerokość geograficzna')).toHaveValue('50.05');

  await dialog.getByLabel('Opis sytuacji').fill('Worki ze śmieciami przy ścieżce');
  await dialog.getByLabel('Typ sytuacji').click();
  await page.getByRole('option', { name: 'Dzikie wysypisko' }).click();

  // Disabled until the Turnstile widget hands over a token.
  const submit = dialog.getByRole('button', { name: 'Zapisz' });
  await expect(submit).toBeEnabled();
  await submit.click();
}

test('saves a report placed in the forest', async ({ page }) => {
  await seedForest();

  await submitDumpReport(page);

  await expect(page.getByText('Dziękujemy! Zgłoszenie zostało dodane.')).toBeVisible();
  await expect.poll(() => countReports('ILLEGAL_DUMP')).toBe(1);
});

test('rejects a report away from any forest', async ({ page }) => {
  await submitDumpReport(page);

  await expect(page.getByText('Zgłoszenia można dodawać tylko w lesie lub w jego pobliżu.')).toBeVisible();
  expect(await countReports()).toBe(0);
});

test('a saved report counts in the next safety assessment', async ({ page }) => {
  await seedForest();
  await seedFireZone(0);
  await markFireAndBansSynced();

  await submitDumpReport(page);
  await expect(page.getByText('Dziękujemy! Zgłoszenie zostało dodane.')).toBeVisible();

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Zgłoszenia w pobliżu', { exact: true }).locator('..')).toHaveText(/^Zgłoszenia w pobliżu\s*1$/);
});
