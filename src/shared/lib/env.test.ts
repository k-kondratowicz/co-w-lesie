import { expect, it } from 'vitest';
import { assertProductionEnv } from '@/shared/lib/env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@host:5432/db',
  CRON_SECRET: 'a'.repeat(32),
  VOTE_SALT: 'b'.repeat(32),
  TURNSTILE_SECRET_KEY: 'c'.repeat(32),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAA-real-site-key',
  NEXT_PUBLIC_FOREST_PMTILES_URL: 'https://example.com/tiles.pmtiles',
  VAPID_PUBLIC_KEY: 'pub',
  VAPID_PRIVATE_KEY: 'priv',
  VAPID_SUBJECT: 'mailto:kontakt@co-w-lesie.pl',
};

it('accepts a complete production environment', () => {
  expect(() => assertProductionEnv(valid)).not.toThrow();
});

it('names placeholder values without printing them', () => {
  const env = { ...valid, VOTE_SALT: 'change-me', VAPID_PRIVATE_KEY: '<vapid-private-key>' };

  expect(() => assertProductionEnv(env)).toThrow(/VOTE_SALT/);
  expect(() => assertProductionEnv(env)).toThrow(/VAPID_PRIVATE_KEY/);
  expect(() => assertProductionEnv(env)).not.toThrow(/change-me|<vapid-private-key>/);
});

it('reports a missing variable by name', () => {
  const { CRON_SECRET: _, ...env } = valid;

  expect(() => assertProductionEnv(env)).toThrow(/CRON_SECRET/);
});

it.each(['1x00000000000000000000AA', '1x00000000000000000000BB', '2x00000000000000000000AB', '3x00000000000000000000FF'])(
  'rejects the Cloudflare test site key %s',
  (siteKey) => {
    expect(() => assertProductionEnv({ ...valid, NEXT_PUBLIC_TURNSTILE_SITE_KEY: siteKey })).toThrow(
      /NEXT_PUBLIC_TURNSTILE_SITE_KEY/,
    );
  },
);

it.each(['1x0000000000000000000000000000000AA', '2x0000000000000000000000000000000AA', '3x0000000000000000000000000000000AA'])(
  'rejects the Cloudflare test secret key %s',
  (secretKey) => {
    expect(() => assertProductionEnv({ ...valid, TURNSTILE_SECRET_KEY: secretKey })).toThrow(/TURNSTILE_SECRET_KEY/);
  },
);

it('rejects an empty Turnstile site key', () => {
  expect(() => assertProductionEnv({ ...valid, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' })).toThrow(/NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
});

it('rejects a secret shorter than 16 characters', () => {
  expect(() => assertProductionEnv({ ...valid, CRON_SECRET: 'short-secret' })).toThrow(/CRON_SECRET/);
});

it('rejects the placeholder PMTiles URL from .env.example', () => {
  const env = { ...valid, NEXT_PUBLIC_FOREST_PMTILES_URL: 'https://<your-account>.r2.dev/poland_forests.pmtiles' };

  expect(() => assertProductionEnv(env)).toThrow(/NEXT_PUBLIC_FOREST_PMTILES_URL/);
});

it('rejects a VAPID subject that is neither mailto: nor https:', () => {
  expect(() => assertProductionEnv({ ...valid, VAPID_SUBJECT: 'kontakt@co-w-lesie.pl' })).toThrow(/VAPID_SUBJECT/);
});
