'use client';

import { useEffect } from 'react';

// Registers the service worker in production only (dev keeps HMR free of SW caching).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failures are non-fatal - the app works without offline support.
    });
  }, []);

  return null;
}
