// Minimal service worker — enables "install app" and an offline fallback for the app shell.
// Intentionally conservative: it only handles page navigations. API calls, map tiles and the
// PMTiles file always go straight to the network (never cached here).

const CACHE = 'cwl-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Network-first for navigations: always try the live app, fall back to the cached shell offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('/', copy));
        return response;
      })
      .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
  );
});
