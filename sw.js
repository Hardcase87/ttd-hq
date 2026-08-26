const CACHE = 'ttd-hq-v11-hardcore-checkout';
const CORE = [
  './',
  './index.html',
  './arcade.html',
  './comics.html',
  './dossiers.html',
  './map.html',
  './payments.html',
  './store.html',
  './contact.html',
  './privacy.html',
  './terms.html',
  './shipping.html',
  './refunds.html',
  './checkout.html',
  './checkout.css',
  './checkout.js',
  './checkout-catalog.js',
  './store-checkout-bridge.js',
  './payment-order-bridge.js',
  './styles.css',
  './commercial.css',
  './app.js',
  './manifest.json',
  './assets/images/ttd-banner.png',
  './assets/images/ttd-logo-app.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(CORE.map(url => cache.add(url)))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    try {
      /* Network first on purpose.
         TTD changes constantly and old Safari/PWA cache was serving dead builds. */
      const fresh = await fetch(request, { cache: 'no-store' });

      if (fresh && fresh.ok && request.url.startsWith(self.location.origin)) {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
      }

      return fresh;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const home = await caches.match('./index.html');
        if (home) return home;
      }

      throw error;
    }
  })());
});
