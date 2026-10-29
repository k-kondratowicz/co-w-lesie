import * as Sentry from '@sentry/nextjs';
import { SENTRY_DATA_COLLECTION } from '@/shared/lib/sentry-data-collection';

// Edge runtime (middleware/proxy) error monitoring. Active only in production with a DSN set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  dataCollection: SENTRY_DATA_COLLECTION,
});
