const CACHE = 'ttd-hq-v4';
const CORE = [
  './','./index.html','./map.html','./comics.html','./dossiers.html','./tbn.html','./arcade.html','./store.html',
  './styles.css','./app.js','./manifest.json',
  './assets/images/ttd-banner.png','./assets/images/ttd-logo-app.png',
  './assets/images/module-city-map.png','./assets/images/module-comics.png','./assets/images/module-dossiers.png',
  './assets/images/module-tbn.png','./assets/images/module-arcade.png','./assets/images/module-store.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
