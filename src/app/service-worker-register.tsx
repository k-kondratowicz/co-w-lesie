'use client';

import { useEffect } from 'react';

// Registers the service worker in production only (dev keeps HMR free of SW caching).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let observer: PerformanceObserver | undefined;
    const staticPrefix = `${window.location.origin}/_next/static/`;
    const isOfflineAsset = (url: string) => url.startsWith(staticPrefix) || new URL(url).hostname.endsWith('.cartocdn.com');

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // The worker only sees requests once it controls the page, so it learns from here what this
        // load fetched before that, and which chunks are still in use (see public/sw.js).
        observer = new PerformanceObserver((list) => {
          const urls = list
            .getEntries()
            .map((entry) => entry.name)
            .filter(isOfflineAsset);
          if (urls.length > 0) {
            registration.active?.postMessage({ type: 'loaded-assets', urls });
          }
        });
        observer.observe({ type: 'resource', buffered: true });
      })
      .catch(() => {
        // Registration failures are non-fatal - the app works without offline support.
      });

    return () => observer?.disconnect();
  }, []);

  return null;
}
