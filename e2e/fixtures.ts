import { test as base, expect, type Page } from '@playwright/test';
import { FOREST_SPOT } from './utils/db';

// A blank base map: the specs check our data and wording, and Carto's CDN (or the R2 forest
// tiles) being slow must not fail them. The map still fires load and runs every app layer.
const BLANK_STYLE = { version: 8, sources: {}, layers: [{ id: 'background', type: 'background' }] };

// Every spec starts as a returning visitor who already answered the consent banner, so the
// banner never covers the thumb-zone buttons.
export const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    // The reports API allows 5 posts a minute per IP and every test comes from localhost, so a
    // full run trips it. Each test acts as its own visitor, like real users would.
    await context.route('/api/**', (route) =>
      route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': `e2e-${testInfo.testId}` } }),
    );
    await context.route('https://basemaps.cartocdn.com/gl/**/style.json', (route) => route.fulfill({ json: BLANK_STYLE }));
    await context.route(/basemaps\.cartocdn\.com\/(?!gl\/)|\.pmtiles/, (route) => route.abort());
    await page.addInitScript(() => window.localStorage.setItem('cwl-consent', 'rejected'));
    await use(page);
  },
});

export { expect };

// The full-screen "Ładowanie mapy..." cover blocks every button until MapLibre fires load.
export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  // The canvas and the cover mount in the same render, so "hidden" cannot pass before hydration.
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.getByText('Ładowanie mapy...')).toBeHidden({ timeout: 45_000 });
}

export async function assessMyLocation(page: Page) {
  await page.getByRole('button', { name: 'Czy mogę iść do lasu?' }).click();
  const dialog = page.getByRole('dialog');

  // The dialog assesses the GPS fix on its own once the map has one; before that it asks.
  const useMyLocation = dialog.getByRole('button', { name: 'Użyj mojej lokalizacji' });
  const result = dialog.getByText(
    /^(Niskie ryzyko|Zachowaj ostrożność|Odradzamy wyjście do lasu|Brak pełnych danych - zachowaj ostrożność)$/,
  );
  await expect(useMyLocation.or(result).first()).toBeVisible();
  if (await useMyLocation.isVisible()) {
    await useMyLocation.click();
  }

  await expect(result).toBeVisible();

  return dialog;
}

export async function fillReport(page: Page, description: string) {
  await page.getByRole('button', { name: 'Dodaj zgłoszenie' }).click();
  const dialog = page.getByRole('dialog', { name: /^Zgłoś sytuację w lesie/ });

  // The map may already have a GPS fix that pre-fills the field ("Odśwież") or not yet ("Pobierz").
  await dialog.getByRole('button', { name: /^(Pobierz|Odśwież) lokalizację$/ }).click();
  await expect(dialog.getByLabel('Szerokość geograficzna')).toHaveValue(String(FOREST_SPOT.latitude));

  await dialog.getByLabel('Opis sytuacji').fill(description);
  await dialog.getByLabel('Typ sytuacji').click();
  await page.getByRole('option', { name: 'Strzały', exact: true }).click();

  return dialog;
}
