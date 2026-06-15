import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// DB-backed tests for the report route handlers. Run with `npm run test:integration`.
// Needs a reachable PostGIS instance; defaults to the local Docker DB (a separate test database).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/cowlesie_test';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.integration.test.ts'],
    globalSetup: ['./test/integration/global-setup.ts'],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // One DB, shared tables — run files serially so they don't truncate each other mid-test.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
