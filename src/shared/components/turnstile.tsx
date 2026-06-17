'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import { Spinner } from '@/shared/components/ui';
import { loadTurnstileScript, TURNSTILE_SITE_KEY } from '@/shared/lib/turnstile-client';

// Inline Turnstile widget. Must live inside the dialog/popup it guards: a Radix modal traps
// interaction, so a challenge rendered outside it (e.g. on document.body) can't be clicked.
// `interaction-only` keeps it invisible for legitimate visitors and only expands when a challenge
// is actually required. Renders nothing when unconfigured (the server then accepts the request).
//
// The solved token is written into `tokenRef` rather than reported via a callback prop - a function
// prop here trips Next's "use client" boundary lint (it can't tell a plain client-to-client callback
// from a Server Action), and the caller reads the token from a ref at submit time anyway.
export function Turnstile({ tokenRef, className }: { tokenRef: RefObject<string | null>; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey) {
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    setIsLoading(true);

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: (token) => {
            tokenRef.current = token;
          },
          'expired-callback': () => {
            tokenRef.current = null;
          },
          'error-callback': () => {
            tokenRef.current = null;
          },
        });
      })
      .catch(() => {
        tokenRef.current = null;
      })
      .finally(() => setIsLoading(false));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [tokenRef]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div ref={containerRef} className={className}>
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner /> Sprawdzam czy jesteś człowiekiem...
        </div>
      )}
    </div>
  );
}
