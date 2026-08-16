self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ttd-hq-v1').then((cache) => cache.addAll([
      './',
      './index.html',
      './styles.css',
      './app.js',
      './manifest.json'
    ]))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
