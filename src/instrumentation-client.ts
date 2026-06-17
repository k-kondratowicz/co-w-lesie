import * as Sentry from '@sentry/nextjs';
import { hasAnalyticsConsent } from '@/shared/lib/consent';
import { initSentryClient } from '@/shared/lib/sentry-client';

// Browser error/perf monitoring. Initialised only once the visitor has opted in; the consent
// banner calls initSentryClient() the moment they accept, so a returning visitor starts here.
if (hasAnalyticsConsent()) {
  initSentryClient();
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
