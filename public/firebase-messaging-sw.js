importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

// TODO: Replace with your project's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize the Firebase app
const app = firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging object.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192.png', // Use your default icon
    badge: payload.notification.badge || '/icons/icon-192.png', // Use your default badge
    data: payload.data, // Include any data payload
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle foreground messages if needed (optional, typically handled in the main app)
// messaging.onMessage((payload) => {
//   console.log('[firebase-messaging-sw.js] Received foreground message ', payload);
//   // You might choose to display a different type of in-app notification
//   // or still show a standard notification here.
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: payload.notification.icon || '/icons/icon-192.png',
//     badge: payload.notification.badge || '/icons/icon-192.png',
//     data: payload.data,
//   };

//   self.registration.showNotification(
//     notificationTitle,
//     notificationOptions
//   );
// });