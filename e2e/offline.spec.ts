import { expect, fillReport, openApp, test } from './fixtures';
import { countReports, resetData, seedForest } from './utils/db';

test.beforeEach(async () => {
  await resetData();
  await seedForest();
});

test('a report made offline is queued and sent once the connection returns', async ({ page, context }) => {
  await openApp(page);
  await context.setOffline(true);

  const dialog = await fillReport(page, 'Zgłoszenie bez zasięgu (E2E)');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();

  await expect(page.getByText('Brak internetu - zgłoszenie wyślemy automatycznie, gdy wróci połączenie.')).toBeVisible();
  expect(await countReports()).toBe(0);

  await context.setOffline(false);

  await expect(page.getByText('Wysłano zaległe zgłoszenie.')).toBeVisible({ timeout: 30_000 });
  expect(await countReports('SHOTS')).toBe(1);
});
