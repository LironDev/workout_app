/* ============================================================
   SERVICE WORKER — FitLife PWA
   Cache-First for static assets, Network-First for Wger API
   ============================================================ */

const CACHE_VERSION  = 'v1';
const STATIC_CACHE   = `fna-static-${CACHE_VERSION}`;
const API_CACHE      = `fna-api-${CACHE_VERSION}`;
const WGER_ORIGIN    = 'https://wger.de';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/views.css',
  './css/animations.css',
  './js/main.js',
  './js/router.js',
  './js/state.js',
  './js/storage.js',
  './js/api.js',
  './js/models.js',
  './js/modules/onboarding.js',
  './js/modules/dashboard.js',
  './js/modules/workout.js',
  './js/modules/nutrition.js',
  './js/modules/gamification.js',
  './js/modules/profiles.js',
  './js/modules/badges.js',
  './js/ui/components.js',
  './js/ui/icons.js',
  './js/ui/toast.js',
  './assets/fallback-exercises.json'
];

/* ---- Install: Pre-cache static assets ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Pre-cache failed:', err))
  );
});

/* ---- Activate: Delete old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: Routing strategy ---- */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url         = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Wger API: Network-First with fallback to API cache
  if (url.origin === WGER_ORIGIN) {
    event.respondWith(_networkFirst(request, API_CACHE, 5000));
    return;
  }

  // App shell & static assets: Cache-First
  if (url.origin === self.location.origin) {
    event.respondWith(_cacheFirst(request, STATIC_CACHE));
    return;
  }

  // External images (wger CDN images): Cache-First
  if (url.hostname.includes('wger')) {
    event.respondWith(_cacheFirst(request, API_CACHE));
    return;
  }
});

/* ---- Strategy: Cache-First ---- */
async function _cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a minimal offline response for navigation requests
    if (request.mode === 'navigate') {
      const appShell = await caches.match('./index.html');
      if (appShell) return appShell;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/* ---- Strategy: Network-First with timeout ---- */
async function _networkFirst(request, cacheName, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    // Try API cache
    const cached = await caches.match(request, { cacheName });
    if (cached) return cached;
    // Fall back to the bundled fallback exercises
    const fallback = await caches.match('./assets/fallback-exercises.json');
    if (fallback) return fallback;
    return new Response(JSON.stringify({ results: [], error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ---- Background Sync placeholder (future) ---- */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
