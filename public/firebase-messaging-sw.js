// This file must be in the public folder.

// --- PWA Caching Logic ---

const CACHE_NAME = 'wash-buddy-cache-v1';
// IMPORTANT: The base URL must match the `base` property in vite.config.ts
const BASE_URL = '/'; 
const URLS_TO_PRECACHE = [
  BASE_URL,
  `${BASE_URL}index.html`,
  `${BASE_URL}manifest.json`,
  `${BASE_URL}icons/icon-192x192.png`,
  `${BASE_URL}icons/icon-512x512.png`
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
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clone the response. A response is a stream and must be cloned
            // to be used by both the browser and the cache.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache http/https requests to avoid errors with browser extensions etc.
                if (event.request.url.startsWith('http')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      })
  );
});


// --- Firebase Messaging Logic ---

// IMPORTANT: Import the scripts for Firebase.
// This syntax is required for service workers.
try {
    importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

    // --- PASTE YOUR FIREBASE CONFIGURATION HERE ---
    // This configuration must be kept in sync with the one in your app.
    // Service workers cannot use environment variables, so it's duplicated here.
    const firebaseConfig = {
        apiKey: "%VITE_FIREBASE_API_KEY%",
        authDomain: "%VITE_FIREBASE_AUTH_DOMAIN%",
        databaseURL: "%VITE_FIREBASE_DATABASE_URL%",
        projectId: "%VITE_FIREBASE_PROJECT_ID%",
        storageBucket: "%VITE_FIREBASE_STORAGE_BUCKET%",
        messagingSenderId: "%VITE_FIREBASE_MESSAGING_SENDER_ID%",
        appId: "%VITE_FIREBASE_APP_ID%"
        };

    if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        console.error("Service Worker: Firebase config is not set.");
    } else {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);

        // Retrieve an instance of Firebase Messaging so that it can handle background
        // messages.
        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
            console.log(
                '[firebase-messaging-sw.js] Received background message ',
                payload,
            );

            // Customize notification here
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon || '/icons/icon-192x192.png',
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    }
} catch (e) {
    console.error("Failed to initialize Firebase in service worker", e);
}