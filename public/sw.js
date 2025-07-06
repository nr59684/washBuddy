// This file must be in the public folder.

const CACHE_NAME = 'wash-buddy-cache-v2';
// IMPORTANT: The base URL must match the `base` property in vite.config.ts
const BASE_URL = '/'; 
const URLS_TO_PRECACHE = [
  BASE_URL,
  `${BASE_URL}index.html`,
  `${BASE_URL}manifest.json`,
  // Add paths to your icons here
];

// On install, pre-cache the app shell.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_PRECACHE);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell', error);
      })
  );
  self.skipWaiting();
});

// On activate, clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// On fetch, serve from cache first, then network.
self.addEventListener('fetch', event => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignore Firebase auth and database requests to prevent caching issues.
  const url = new URL(event.request.url);
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network, then cache it for next time.
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response. A response is a stream and must be cloned
            // to be used by both the browser and the cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Failed to parse push data:', e);
      data = { title: 'New Notification', body: event.data.text() };
    }
  }

  const { title, body, icon, badge } = data;
  
  const options = {
    body: body || 'You have a new message from Wash Buddy.',
    icon: icon || 'https://i.imgur.com/O9N4p5p.png',
    badge: badge || 'https://i.imgur.com/O9N4p5p.png',
  };

  event.waitUntil(self.registration.showNotification(title || 'Wash Buddy', options));
});