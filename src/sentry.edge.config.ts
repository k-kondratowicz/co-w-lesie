import * as Sentry from '@sentry/nextjs';

// Edge runtime (middleware/proxy) error monitoring. Active only in production with a DSN set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});
