const CACHE_NAME = 'pria-v4';
const TTS_CACHE = 'pria-tts-v1';
const MAX_TTS_ENTRIES = 200; // Limit TTS cache size

const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.json',
];

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, TTS_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !keepCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

/**
 * Trim TTS cache to MAX_TTS_ENTRIES by removing oldest entries
 */
async function trimTTSCache() {
  try {
    const cache = await caches.open(TTS_CACHE);
    const keys = await cache.keys();
    if (keys.length > MAX_TTS_ENTRIES) {
      const toDelete = keys.slice(0, keys.length - MAX_TTS_ENTRIES);
      await Promise.all(toDelete.map((key) => cache.delete(key)));
    }
  } catch {
    // Silently ignore cache trimming errors
  }
}

// Fetch — smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Google Translate TTS: cache audio for offline listening (separate cache with size limit)
  if (url.hostname === 'translate.google.com' || url.hostname === 'translate.googleapis.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(TTS_CACHE).then((cache) => {
              cache.put(request, clone);
              trimTTSCache(); // Evict old entries
            });
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Vite hashed assets (JS/CSS bundles): cache-first, immutable
  if (url.origin === self.location.origin && /\/assets\/.*\.[a-zA-Z0-9_-]+\.(js|css|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Return cached version, or fallback to index.html for same-origin
          return cached || caches.match('/index.html').then((fallback) => {
            return fallback || new Response('Offline', { status: 503 });
          });
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // External requests: network-only (don't cache)
  event.respondWith(fetch(request));
});
