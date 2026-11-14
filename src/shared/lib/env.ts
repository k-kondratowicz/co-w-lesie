import { z } from 'zod';

// The .env.example values ("change-me", "<vapid-public-key>", ...) that a copied file carries into production.
const PLACEHOLDER = /^(change-me|<.*>)$/;
// Cloudflare's documented Turnstile test keys. The 1x ones switch bot protection off without a trace,
// the 2x/3x ones block or challenge every report - none of them belongs in production.
const TURNSTILE_TEST_KEY = /^[123]x0+[A-F]{2}$/;

const configured = z
  .string()
  .min(1)
  .refine((value) => !PLACEHOLDER.test(value), 'placeholder value');

const secret = configured.min(16);

const turnstileKey = (schema: z.ZodString) => schema.refine((value) => !TURNSTILE_TEST_KEY.test(value), 'Cloudflare test key');

const productionEnvSchema = z.object({
  DATABASE_URL: z.url(),
  CRON_SECRET: secret,
  VOTE_SALT: secret,
  TURNSTILE_SECRET_KEY: turnstileKey(secret),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: turnstileKey(configured),
  NEXT_PUBLIC_FOREST_PMTILES_URL: z.url(),
  VAPID_PUBLIC_KEY: configured,
  VAPID_PRIVATE_KEY: configured,
  // web-push only rejects a bad subject when the first alert is sent, so check it at build time.
  VAPID_SUBJECT: configured.regex(/^(mailto:|https:)/),
});

/** Throws when a variable production depends on is missing, a placeholder or a test key. Names only - never values. */
export function assertProductionEnv(env: Record<string, string | undefined> = process.env): void {
  const result = productionEnvSchema.safeParse(env);

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ');

    throw new Error(`Unsafe production environment: ${names}`);
  }
}
