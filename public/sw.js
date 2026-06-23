// Service worker: enables "install app", an offline shell fallback, offline basemap tiles, and
// Web Push for saved-area hazard alerts. The PMTiles forest file (served via HTTP Range / 206)
// and API calls are NOT cached here - the forest layer needs a connection, and report/ban data
// is cached by TanStack Query persistence.

const SHELL_CACHE = 'cwl-shell-v1';
const TILE_CACHE = 'cwl-tiles-v1';
const TILE_CACHE_LIMIT = 600;
const CURRENT_CACHES = [SHELL_CACHE, TILE_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) {
    return;
  }

  for (const key of keys.slice(0, keys.length - max)) {
    await cache.delete(key);
  }
}

// Cache-first for the Carto basemap (style, glyphs, sprite, vector tiles) so areas you've already
// browsed keep rendering offline. Basemap is effectively static; bump TILE_CACHE to invalidate.
async function cacheFirstTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache, TILE_CACHE_LIMIT);
    }

    return response;
  } catch {
    return cached ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  if (new URL(request.url).hostname.endsWith('cartocdn.com')) {
    event.respondWith(cacheFirstTile(request));
    return;
  }

  // Network-first for navigations: always try the live app, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
    );
  }
});

// Saved-area hazard alert. The payload is built server-side (notify-areas) and is always a
// warning - we never push an "all clear", per the safety rule. userVisibleOnly subscriptions
// require showing a notification for every push, so always resolve to showNotification.
self.addEventListener('push', (event) => {
  let payload = { title: 'Co w lesie', body: 'Zmiana warunków w zapisanym obszarze.', url: '/' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }

      return self.clients.openWindow(target);
    }),
  );
});
