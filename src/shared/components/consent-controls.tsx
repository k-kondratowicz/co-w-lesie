'use client';

import { useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { initSentryClient } from '@/shared/lib/sentry-client';
import { useConsentStore } from '@/shared/store/use-consent-store';

const STATUS_LABEL = {
  pending: 'Nie wybrano',
  accepted: 'Włączona',
  rejected: 'Wyłączona',
} as const;

// Lets visitors change the analytics/monitoring choice at any time - withdrawal must be as easy
// as giving consent. Switching off stops analytics immediately; error monitoring stops on reload.
export function ConsentControls() {
  const consent = useConsentStore((state) => state.consent);
  const hydrate = useConsentStore((state) => state.hydrate);
  const setConsent = useConsentStore((state) => state.setConsent);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const accept = () => {
    setConsent('accepted');
    initSentryClient();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        Analityka i monitorowanie błędów: <span className="font-medium">{STATUS_LABEL[consent]}</span>
      </p>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => setConsent('rejected')} disabled={consent === 'rejected'}>
          Wyłącz
        </Button>
        <Button size="sm" onClick={accept} disabled={consent === 'accepted'}>
          Włącz
        </Button>
      </div>
    </div>
  );
}
