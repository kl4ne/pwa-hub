const VERSION = '1.2.0-ui4';
const CACHE_PREFIX = 'rmacfie-pwa-hub';
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${VERSION}`;

const CRITICAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

const OPTIONAL_ASSETS = [
  './links.json',
  './avatar.jpg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);

    // The shell must be complete before this worker is considered installed.
    await cache.addAll(CRITICAL_ASSETS);

    // Optional media/data failures should not prevent installation.
    const results = await Promise.allSettled(
      OPTIONAL_ASSETS.map((url) => cache.add(url))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn('[sw] Optional asset was not precached:', OPTIONAL_ASSETS[index]);
      }
    });
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const validCaches = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !validCaches.has(key))
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isLinksRequest(url) {
  return url.pathname.endsWith('/links.json');
}

async function networkFirst(request, cacheName, fallbackUrl = null) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl, { ignoreSearch: true });
      if (fallback) return fallback;
    }

    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  const cache = await caches.open(RUNTIME_CACHE);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise;
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function linksNetworkFirst(request) {
  const canonicalUrl = new URL('./links.json', self.registration.scope).href;

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      // Store the latest successful response at one stable cache key so the
      // timestamp query string used by app.js never fragments the cache.
      await cache.put(canonicalUrl, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(canonicalUrl, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Do not interfere with third-party resources or destination sites.
  if (url.origin !== self.location.origin) return;

  if (isLinksRequest(url)) {
    event.respondWith(linksNetworkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, './index.html'));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'manifest') {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});
