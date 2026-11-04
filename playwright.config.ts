import { defineConfig, devices } from '@playwright/test';
import { E2E_DATABASE_URL, FOREST_SPOT } from './e2e/utils/db';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/setup.ts',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    geolocation: FOREST_SPOT,
    permissions: ['geolocation'],
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],

  webServer: {
    command: `npm run build && npm start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      CRON_SECRET: 'e2e-cron-secret',
      VOTE_SALT: 'e2e-vote-salt',
      // Cloudflare's documented always-pass keys: the real widget runs and hands out a token.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      // Next still loads a local .env; blank these so a run never writes to real Redis or R2.
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      R2_ACCOUNT_ID: '',
      R2_ACCESS_KEY_ID: '',
      R2_SECRET_ACCESS_KEY: '',
      R2_BUCKET: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
    },
  },
});
