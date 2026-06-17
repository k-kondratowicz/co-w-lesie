'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { Spinner } from '@/shared/components/ui';
import { useOnlineStatus } from '@/shared/hooks/use-online-status';
import { loadTurnstileScript, TURNSTILE_SITE_KEY } from '@/shared/lib/turnstile-client';
import { cn } from '@/shared/lib/utils';
import { useTurnstileStore } from '@/shared/store/use-turnstile-store';

// Inline Turnstile widget. Must live inside the dialog/popup it guards: a Radix modal traps
// interaction, so a challenge rendered outside it (e.g. on document.body) can't be clicked.
// `interaction-only` keeps it invisible for legitimate visitors and only expands when a challenge
// is actually required. Renders nothing when unconfigured (the server then accepts the request).
//
// Rendering the widget can take several seconds, so we surface a status (via useTurnstileStore)
// that lets the form show a "verifying" hint and keep submit disabled until a token lands. The
// token itself is written into `tokenRef`, not reported via a callback prop - a function prop here
// trips Next's "use client" boundary lint (it can't tell a plain client-to-client callback from a
// Server Action), and the caller reads the token from a ref at submit time anyway.
export function Turnstile({ tokenRef, className }: { tokenRef: RefObject<string | null>; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();
  const status = useTurnstileStore((state) => state.status);
  const setStatus = useTurnstileStore((state) => state.setStatus);

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey) {
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    setStatus('verifying');

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
            setStatus('ready');
          },
          'expired-callback': () => {
            tokenRef.current = null;
            setStatus('verifying');
          },
          'error-callback': () => {
            tokenRef.current = null;
            setStatus('error');
          },
        });
      })
      .catch(() => {
        tokenRef.current = null;
        setStatus('error');
      });

    return () => {
      cancelled = true;
      setStatus('idle');
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [tokenRef, setStatus]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div ref={containerRef} className="flex justify-center empty:hidden" />

      {online && status === 'verifying' && (
        <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Spinner /> Sprawdzamy, czy nie jesteś robotem. Poczekaj chwilę przed wysłaniem.
        </p>
      )}

      {online && status === 'error' && (
        <p className="text-center text-destructive text-sm">Nie udało się zweryfikować. Odśwież stronę i spróbuj ponownie.</p>
      )}
    </div>
  );
}
