import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Default (unit) run. Mirrors the tsconfig `@/*` alias. DB-backed `*.integration.test.ts` files
// are excluded here and run separately via `npm run test:integration`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Tests run outside Next, where the real package throws on import.
      'server-only': fileURLToPath(new URL('./test/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts', 'e2e/**'],
  },
});
