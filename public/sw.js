self.addEventListener('install', (event) => {
  console.log('Laxmi Library Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
  // Offline support ke liye baad mein logic add karenge
});
const CACHE_NAME = 'laxmi-library-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// 1. Files ko save (Cache) karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Offline hone par Cache se files dikhana
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Agar cache mein file mil gayi toh wahi dikhao, nahi toh network se lao
        return response || fetch(event.request);
      })
  );
});
