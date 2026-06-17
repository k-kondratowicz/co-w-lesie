'use client';

import { useEffect, useRef, useState } from 'react';
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
// The solved token (and a failure flag) are published to useTurnstileStore so the guarding form
// can keep submit disabled until a token lands and read the token at submit time. The "loading"
// spinner is local: it only covers the slow script-fetch/render, after which the widget shows its
// own UI (an invisible auto-pass or a checkbox challenge) and our hint must get out of the way.
export function Turnstile({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();
  const failed = useTurnstileStore((state) => state.failed);
  const solve = useTurnstileStore((state) => state.solve);
  const fail = useTurnstileStore((state) => state.fail);
  const reset = useTurnstileStore((state) => state.reset);

  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey) {
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    reset();
    setRendering(true);

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: solve,
          'expired-callback': reset,
          'error-callback': fail,
        });

        setRendering(false);
      })
      .catch(() => {
        fail();
        setRendering(false);
      });

    return () => {
      cancelled = true;
      reset();
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [solve, fail, reset]);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div ref={containerRef} className="flex justify-center empty:hidden" />

      {online && rendering && (
        <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Spinner /> Sprawdzamy, czy nie jesteś robotem. Poczekaj chwilę.
        </p>
      )}

      {online && failed && (
        <p className="text-center text-destructive text-sm">Nie udało się zweryfikować. Odśwież stronę i spróbuj ponownie.</p>
      )}
    </div>
  );
}
