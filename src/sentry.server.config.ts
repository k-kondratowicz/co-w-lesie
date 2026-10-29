import * as Sentry from '@sentry/nextjs';
import { SENTRY_DATA_COLLECTION } from '@/shared/lib/sentry-data-collection';

// Server runtime error/perf monitoring. Active only in production and only when a DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  dataCollection: SENTRY_DATA_COLLECTION,
});
