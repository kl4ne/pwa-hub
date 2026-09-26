const VERSION = '1.3.1';
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
  './config.json',
  './changelog.json',
  './qr-hub.svg',
  './avatar.jpg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.svg',
  './assets/glp1-icon.png',
  './assets/ai-council-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CRITICAL_ASSETS);

    const results = await Promise.allSettled(
      OPTIONAL_ASSETS.map((url) => cache.add(url))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn('[sw] Optional asset was not precached:', OPTIONAL_ASSETS[index]);
      }
    });

    await self.skipWaiting();
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

function isDataRequest(url) {
  return url.pathname.endsWith('/links.json') ||
    url.pathname.endsWith('/config.json') ||
    url.pathname.endsWith('/changelog.json');
}

function offlineResponse() {
  return new Response('Offline', {
    status:503,
    headers:{'Content-Type':'text/plain; charset=utf-8'}
  });
}

async function putIfCacheable(cacheName, request, response) {
  if (!response || !response.ok) return;

  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (error) {
    console.warn('[sw] Cache write failed:', error);
  }
}

async function networkFirst(request, cacheName, fallbackUrl = null) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      await putIfCacheable(cacheName, request, response);
      return response;
    }

    const cached = await caches.match(request, {ignoreSearch:true});
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl, {ignoreSearch:true});
      if (fallback) return fallback;
    }

    return response || offlineResponse();
  } catch {
    const cached = await caches.match(request, {ignoreSearch:true});
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl, {ignoreSearch:true});
      if (fallback) return fallback;
    }

    return offlineResponse();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, {ignoreSearch:true});

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await putIfCacheable(RUNTIME_CACHE, request, response);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }

  const response = await networkPromise;
  return response || offlineResponse();
}

async function dataNetworkFirst(request) {
  const fileName = new URL(request.url).pathname.split('/').pop();
  const canonicalUrl = new URL(fileName, self.registration.scope).href;

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(canonicalUrl, response.clone());
      return response;
    }

    const cached = await caches.match(canonicalUrl, {ignoreSearch:true});
    return cached || response || offlineResponse();
  } catch {
    const cached = await caches.match(canonicalUrl, {ignoreSearch:true});
    return cached || offlineResponse();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (isDataRequest(url)) {
    event.respondWith(dataNetworkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, './index.html'));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});
