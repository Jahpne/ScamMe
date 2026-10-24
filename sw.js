/* ==========================================================================
   sw.js  |  SPOT THE SCAM  (service worker)
   Saves every file on the first visit so the game runs with no internet.

   Strategy: cache first, refresh in the background. Pages open instantly
   even on a weak connection, and updates show up on the next open.

   To ship an update: change VERSION below, then redeploy.
   ========================================================================== */
const VERSION = 'v1';
const CACHE = 'spot-the-scam-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './game.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('spot-the-scam-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || caches.match('./index.html'));
      return hit || refresh;
    })
  );
});
