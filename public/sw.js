// Service worker: enables "install app", an offline start (the `/` shell plus the Next static assets
// it loads), offline basemap tiles, and Web Push for saved-area hazard alerts. The PMTiles forest
// file (served via HTTP Range / 206) and API calls are NOT cached here - the forest layer needs a
// connection, and report/ban data is cached by TanStack Query persistence.

const SHELL_CACHE = 'cwl-shell-v2';
const TILE_CACHE = 'cwl-tiles-v1';
const STATIC_CACHE = 'cwl-static-v1';
const TILE_CACHE_LIMIT = 600;
const STATIC_CACHE_LIMIT = 300;
const CURRENT_CACHES = [SHELL_CACHE, TILE_CACHE, STATIC_CACHE];

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

// cache.keys() lists entries oldest-first, so this drops the oldest evictable entries.
async function trimCache(cache, max, isEvictable = () => true) {
  const keys = await cache.keys();
  const excess = keys.length - max;
  if (excess <= 0) {
    return;
  }

  for (const key of keys.filter(isEvictable).slice(0, excess)) {
    await cache.delete(key);
  }
}

// The style, sprite and glyphs are cached first and never re-fetched, so oldest-first trimming would
// drop them before any tile and leave the map stuck on its loading cover offline. Only tiles go.
function isBasemapTile(request) {
  return new URL(request.url).pathname.includes('/vectortiles/');
}

function isBasemap(url) {
  return url.hostname.endsWith('.cartocdn.com');
}

function isStaticAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

async function cacheFirst(event, cacheName, afterPut) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  if (cached) {
    return cached;
  }

  const response = await fetch(event.request);
  if (response.ok) {
    const copy = response.clone();
    event.waitUntil(cache.put(event.request, copy).then(() => afterPut?.(cache)));
  }

  return response;
}

// Network-first, falling back to the cached shell offline and when the server errors. Only `/` is
// stored: an offline start must open the map, not whichever page was visited last.
async function networkFirstShell(event) {
  try {
    const response = await fetch(event.request);
    if (response.ok && new URL(event.request.url).pathname === '/') {
      const copy = response.clone();
      event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)));
    }

    if (response.status < 500) {
      return response;
    }

    return (await caches.match('/')) ?? response;
  } catch {
    return (await caches.match('/')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Cache-first for the Carto basemap (style, glyphs, sprite, vector tiles) so areas you've already
  // browsed keep rendering offline. Basemap is effectively static; bump TILE_CACHE to invalidate.
  if (isBasemap(url)) {
    event.respondWith(cacheFirst(event, TILE_CACHE, (cache) => trimCache(cache, TILE_CACHE_LIMIT, isBasemapTile)));
    return;
  }

  // Hashed file names never change content, so cache-first is safe. Trimming happens on the
  // page's report below, where the assets in use are known.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(event));
  }
});

// The page reports what it loaded (see service-worker-register.tsx). The first visit fetches its
// chunks and the basemap style before this worker is active, so without the report an offline
// start right after it gets a shell with no working JS and a map stuck on its loading cover.
async function storeMissingBasemap(urls) {
  if (urls.length === 0) {
    return;
  }

  const cache = await caches.open(TILE_CACHE);
  let added = 0;
  for (const url of urls) {
    if (await cache.match(url)) {
      continue;
    }

    // A failed fetch only leaves the asset uncached; the next report retries it.
    const stored = await cache.add(url).then(
      () => true,
      () => false,
    );
    added += stored ? 1 : 0;
  }

  // Most reports are tiles the fetch handler already stored, so skip the keys() scan for them.
  if (added > 0) {
    await trimCache(cache, TILE_CACHE_LIMIT, isBasemapTile);
  }
}

// Reported assets sitting in the older half are re-put to move them to the end, so trimming drops
// earlier builds' leftovers and not a chunk the current shell still loads.
async function refreshStaticAssets(urls) {
  if (urls.length === 0) {
    return;
  }

  const cache = await caches.open(STATIC_CACHE);
  const cachedUrls = (await cache.keys()).map((request) => request.url);
  const cached = new Set(cachedUrls);
  const olderHalf = new Set(cachedUrls.slice(0, Math.floor(cachedUrls.length / 2)));

  for (const url of urls) {
    if (!cached.has(url)) {
      // A failed fetch only leaves the asset uncached; the next report retries it.
      await cache.add(url).catch(() => {});
      continue;
    }

    if (olderHalf.has(url)) {
      const response = await cache.match(url);
      if (response) {
        await cache.put(url, response);
      }
    }
  }

  await trimCache(cache, STATIC_CACHE_LIMIT);
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'loaded-assets' || !Array.isArray(event.data.urls)) {
    return;
  }

  const urls = event.data.urls.filter((value) => typeof value === 'string').map((value) => new URL(value, self.location.origin));

  event.waitUntil(
    Promise.all([
      refreshStaticAssets(urls.filter(isStaticAsset).map((url) => url.href)),
      storeMissingBasemap(urls.filter(isBasemap).map((url) => url.href)),
    ]),
  );
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
