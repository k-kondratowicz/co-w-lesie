import type { Page } from '@playwright/test';
import { assessMyLocation, expect, fillReport, openApp, test } from './fixtures';
import { countReports, markFireAndBansSynced, resetData, seedFireZone, seedForest } from './utils/db';

const DISCLAIMER = 'To ocena pomocnicza i nie zastępuje komunikatów Lasów Państwowych.';
const QUEUED = 'Brak internetu - zgłoszenie wyślemy automatycznie, gdy wróci połączenie.';

test.beforeEach(async () => {
  await resetData();
});

async function queueReportOffline(page: Page) {
  const dialog = await fillReport(page, 'Zgłoszenie bez zasięgu (E2E)');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();

  await expect(page.getByText(QUEUED)).toBeVisible();
}

function pendingReports(page: Page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('cwl-offline-reports') ?? '{}').state?.pending?.length ?? 0);
}

test('a report made offline is queued and sent once the connection returns', async ({ page, context }) => {
  await seedForest();
  await openApp(page);
  await context.setOffline(true);

  await queueReportOffline(page);
  expect(await countReports()).toBe(0);

  await context.setOffline(false);

  await expect(page.getByText('Wysłano zaległe zgłoszenie.')).toBeVisible({ timeout: 30_000 });
  expect(await countReports('SHOTS')).toBe(1);
});

test('a queued report survives closing the app and is sent on the next visit', async ({ page, context }) => {
  await seedForest();
  await openApp(page);
  await context.setOffline(true);

  await queueReportOffline(page);
  await page.close();
  await context.setOffline(false);

  const nextVisit = await context.newPage();
  await openApp(nextVisit);

  await expect(nextVisit.getByText('Wysłano zaległe zgłoszenie.')).toBeVisible({ timeout: 30_000 });
  expect(await countReports('SHOTS')).toBe(1);
});

test('a queued report the server rejects is dropped instead of retried forever', async ({ page, context }) => {
  await openApp(page);
  await context.setOffline(true);

  await queueReportOffline(page);
  await context.setOffline(false);

  await expect(page.getByText('Nie udało się wysłać niektórych zaległych zgłoszeń.')).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => pendingReports(page)).toBe(0);
  expect(await countReports()).toBe(0);
});

test('a cached assessment shown offline warns that conditions may have changed', async ({ page, context }) => {
  await seedForest();
  await seedFireZone(0);
  await markFireAndBansSynced();
  await openApp(page);

  await assessMyLocation(page);
  await page.keyboard.press('Escape');
  await context.setOffline(true);

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText(/^Jesteś offline - to ostatnia zapamiętana ocena/)).toBeVisible();
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
});

test('offline with nothing cached asks for caution instead of showing a result', async ({ page, context }) => {
  // Conditions that would read as low risk, so a result leaking through would be the reassuring one.
  await seedForest();
  await seedFireZone(0);
  await markFireAndBansSynced();
  await openApp(page);
  await context.setOffline(true);

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText(/^Jesteś offline i nie ma zapamiętanej oceny/)).toBeVisible();
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
  await expect(dialog.getByText('Niskie ryzyko', { exact: true })).toHaveCount(0);
});
