// IMPORTANT:
// For this service worker to function, you must copy your Firebase
// config from your .env file into a new file named .env.local
// This ensures that the variables are available during the build process
// for Vite to replace them.

// Example .env.local file:
// VITE_FIREBASE_API_KEY=AIzaSy...
// VITE_FIREBASE_MESSAGING_SENDER_ID=12345...
// ...etc

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "%VITE_FIREBASE_API_KEY%",
  authDomain: "%VITE_FIREBASE_AUTH_DOMAIN%",
  databaseURL: "%VITE_FIREBASE_DATABASE_URL%",
  projectId: "%VITE_FIREBASE_PROJECT_ID%",
  storageBucket: "%VITE_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%VITE_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%VITE_FIREBASE_APP_ID%"
};

// This check ensures that the Vite build process successfully replaced the placeholders.
// If you see this error, the service worker was not built correctly.
if (firebaseConfig.apiKey.startsWith('%VITE_')) {
  console.error(
    'Firebase Service Worker: Environment variables not replaced. Build process may have failed.'
  );
} else {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || "New Notification";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new message.",
      icon: payload.notification?.icon || 'https://i.imgur.com/O9N4p5p.png',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
