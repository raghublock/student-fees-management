self.addEventListener('install', (event) => {
  console.log('Laxmi Library Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
  // Offline support ke liye baad mein logic add karenge
});
