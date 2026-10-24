/* ==========================================================================
   sw.js  |  SPOT THE SCAM  (service worker)
   Saves every file on the first visit so the game runs with no internet.
   Also caches Tesseract.js + the English model so the scanner works offline
   after the first online scan.

   To ship an update: change VERSION below, then redeploy.
   ========================================================================== */
const VERSION = 'v2';
const CACHE = 'spot-the-scam-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './game.js',
  './scan.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

const TESSERACT = [
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js',
  'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) =>
        cache.addAll(ASSETS).then(() => cache.addAll(TESSERACT).catch(() => {}))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('spot-the-scam-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isLocal = url.origin === self.location.origin;
  const isTesseract =
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'tessdata.projectnaptha.com';

  if (!isLocal && !isTesseract) return;

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
        .catch(() => hit || (isLocal ? caches.match('./index.html') : null));
      return hit || refresh;
    })
  );
});
