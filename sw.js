const CACHE = 'ttd-hq-v3';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
      './assets/images/module-city-map.png',
      './assets/images/module-comics.png',
      './assets/images/module-dossiers.png',
      './assets/images/module-tbn.png',
      './assets/images/module-arcade.png',
      './assets/images/module-store.png',
  './assets/images/ttd-banner.png',
  './assets/images/ttd-interface.png',
  './assets/images/ttd-logo-app.png',
  './assets/images/titan-city-issue-1-cover.png',
  './assets/images/titan-city-issue-2-cover.png',
  './assets/images/titan-city-issue-3-cover.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(response => response || fetch(event.request))));
