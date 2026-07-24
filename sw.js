// =============================================
// Service Worker - PKM BO Puskesmas Baniona
// Versi: 2.0
// =============================================

const CACHE_NAME = 'pkm-baniona-v2';

// File yang di-cache saat pertama install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// ── INSTALL: cache aset utama ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: hapus cache lama ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first, fallback ke network ──
self.addEventListener('fetch', event => {
  // Hanya handle request GET
  if (event.request.method !== 'GET') return;

  // Abaikan request ke domain lain (misal: Firebase, API eksternal)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Kembalikan dari cache, sekaligus update cache di background
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        // Langsung kembalikan cache (cepat), update terjadi di background
        return cachedResponse;
      }

      // Tidak ada di cache, ambil dari network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      }).catch(() => {
        // Offline fallback untuk halaman HTML
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
