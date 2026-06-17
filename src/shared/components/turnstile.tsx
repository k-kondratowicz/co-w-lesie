'use client';

import { useEffect, useRef } from 'react';
import { loadTurnstileScript, TURNSTILE_SITE_KEY } from '@/shared/lib/turnstile-client';

// Inline Turnstile widget. Must live inside the dialog/popup it guards: a Radix modal traps
// interaction, so a challenge rendered outside it (e.g. on document.body) can't be clicked.
// `interaction-only` keeps it invisible for legitimate visitors and only expands when a challenge
// is actually required. Renders nothing when unconfigured (the server then accepts the request).
export function Turnstile({ onToken, className }: { onToken: (token: string | null) => void; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey) {
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return null;
  }

  return <div ref={containerRef} className={className} />;
}
