// Randomizer service worker — offline-first PWA.
// Bump CACHE_VERSION on every release to invalidate stale assets.
const CACHE_VERSION = 'v1';
const CACHE = `randomizer-${CACHE_VERSION}`;

// Tool entry pages plus shell assets. Hashed JS/CSS files are cached
// opportunistically on first fetch.
const PRECACHE_URLS = [
  '/',
  '/tools/name-generator/',
  '/tools/password-generator/',
  '/tools/challenge-generator/',
  '/tools/backlog-wheel/',
  '/manifest.json',
  '/logo.svg',
];

const ANALYTICS_HOSTS = ['google-analytics.com', 'googletagmanager.com', 'analytics.google.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept analytics — let it bypass entirely so it can fail silently offline.
  if (ANALYTICS_HOSTS.some((h) => url.hostname.endsWith(h))) return;

  // Navigations: network-first so users get fresh HTML when online,
  // cache fallback so they get *something* offline.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else (JS, CSS, WASM, fonts, images): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last-resort offline page: the cached home shell.
    return (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      // Cache successful responses, including opaque (cross-origin no-cors fonts).
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}
