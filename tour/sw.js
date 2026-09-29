const CACHE_NAME = 'tour-shell-v18';
const APP_SHELL = [
  './',
  './index.html',
  './map.html',
  './manifest.webmanifest',
  './assets/styles.css?v=18',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './js/api.js?v=18',
  './js/app.js?v=18',
  './js/config.js?v=18',
  './js/i18n.js?v=18',
  './js/map.js?v=18',
  './js/pwa.js?v=18',
  './js/runtime-config.js?v=18',
  './js/session-flow.js?v=18'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('tour-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(url.pathname.endsWith('/map.html') ? './map.html' : './index.html'))
    );
    return;
  }

  if (['script', 'style', 'manifest'].includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || network;
    })
  );
});
