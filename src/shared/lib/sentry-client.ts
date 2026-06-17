import * as Sentry from '@sentry/nextjs';

let initialized = false;

// Browser Sentry init, gated behind analytics consent. Called at startup when the visitor has
// already consented, and again the moment they accept the banner - so monitoring starts without a
// reload. `sendDefaultPii: false` keeps IP addresses and other PII out of captured events.
export function initSentryClient(): void {
  if (initialized || process.env.NODE_ENV !== 'production' || !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  initialized = true;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
