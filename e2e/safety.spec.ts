import { assessMyLocation, expect, openApp, test } from './fixtures';
import { markFireAndBansSynced, resetData, seedBan, seedFireZone, seedForest } from './utils/db';

const DISCLAIMER = 'To ocena pomocnicza i nie zastępuje komunikatów Lasów Państwowych.';

// "3 lis 2026, 09:05 (5 minut temu)." - a line reading "brak danych" would still pass toBeVisible.
const SYNCED_AT = /:\s\d+\s\S+\s\d{4},\s\d{2}:\d{2}\s\(.+\)\.$/;
// Fire adds when we last checked BDL: "... (5 minut temu). Sprawdzono 5 minut temu."
const FIRE_SYNCED_AT = /:\s\d+\s\S+\s\d{4},\s\d{2}:\d{2}\s\(.+\)\.\sSprawdzono\s.+\.$/;

test.beforeEach(async ({ page }) => {
  await resetData();
  await seedForest();
  await openApp(page);
});

test('shows low risk with source freshness and the disclaimer when nothing is nearby', async ({ page }) => {
  await seedFireZone(0);
  await markFireAndBansSynced();

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Niskie ryzyko', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/^Brak znanych zagrożeń w pobliżu\./)).toBeVisible();
  await expect(dialog.getByText(/^Zagrożenie pożarowe:/)).toHaveText(FIRE_SYNCED_AT);
  await expect(dialog.getByText(/^Zakazy wstępu:/)).toHaveText(SYNCED_AT);
  await expect(dialog.getByText(/dane nieaktualne/)).toBeHidden();
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
});

test('never reads as low risk when fire and ban data were never synced', async ({ page }) => {
  await seedFireZone(0);

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Brak pełnych danych - zachowaj ostrożność', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/^Nie udało się potwierdzić wszystkich warunków/)).toBeVisible();
  await expect(dialog.getByText('Niskie ryzyko', { exact: true })).toHaveCount(0);
  await expect(dialog.getByText(/^Brak znanych zagrożeń/)).toHaveCount(0);
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
});

test('an entry ban is RED even when the fire hazard is low', async ({ page }) => {
  await seedFireZone(0);
  await seedBan();
  await markFireAndBansSynced();

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Odradzamy wyjście do lasu', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Obowiązuje zakaz wstępu do lasu', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Powód: zagrożenie pożarowe')).toBeVisible();
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
});

test('advises against entering at fire-hazard degree III', async ({ page }) => {
  await seedFireZone(3);
  await markFireAndBansSynced();

  const dialog = await assessMyLocation(page);

  await expect(dialog.getByText('Odradzamy wyjście do lasu', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Stopień III', { exact: true })).toBeVisible();
  await expect(dialog.getByText(DISCLAIMER, { exact: true })).toBeVisible();
});
