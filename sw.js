const CACHE = 'ttd-hq-v2';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
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
