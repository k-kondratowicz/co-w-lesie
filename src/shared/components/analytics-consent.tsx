'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect } from 'react';
import { useConsentStore } from '@/shared/store/use-consent-store';

// Vercel Analytics + Speed Insights load only after the visitor opts in (see ConsentBanner).
export function AnalyticsConsent() {
  const consent = useConsentStore((state) => state.consent);
  const hydrate = useConsentStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (consent !== 'accepted') {
    return null;
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
