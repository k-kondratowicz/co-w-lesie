import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Default (unit) run. Mirrors the tsconfig `@/*` alias. DB-backed `*.integration.test.ts` files
// are excluded here and run separately via `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
  },
});
