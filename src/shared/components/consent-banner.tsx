'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { initSentryClient } from '@/shared/lib/sentry-client';
import { useConsentStore } from '@/shared/store/use-consent-store';

export function ConsentBanner() {
  const consent = useConsentStore((state) => state.consent);
  const hydrate = useConsentStore((state) => state.hydrate);
  const setConsent = useConsentStore((state) => state.setConsent);
  // Stay hidden until we've read the persisted choice - otherwise a returning visitor sees the
  // banner flash for a frame (store defaults to 'pending' before localStorage is read).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  if (!hydrated || consent !== 'pending') {
    return null;
  }

  const accept = () => {
    setConsent('accepted');
    // Start monitoring immediately so we don't miss errors in this first session.
    initSentryClient();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-60 p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:gap-4">
        <p className="text-muted-foreground text-sm">
          Dane niezbędne do działania aplikacji (np. Twoja lokalizacja i zgłoszenia) przetwarzamy zawsze. Za Twoją zgodą włączymy
          też anonimową analitykę i monitorowanie błędów.{' '}
          <Link href="/polityka-prywatnosci" className="font-medium text-foreground underline underline-offset-4">
            Polityka prywatności
          </Link>
          .
        </p>

        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          <Button variant="outline" onClick={() => setConsent('rejected')}>
            Tylko niezbędne
          </Button>
          <Button onClick={accept}>Akceptuję</Button>
        </div>
      </div>
    </div>
  );
}
