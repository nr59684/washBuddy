importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js');

// TODO: Replace with your project's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_ERsCP5M9iQv8YGfzTTcmvxHQPUaQnCg",
  authDomain: "washbuddy-7f682.firebaseapp.com",
  databaseURL: "https://washbuddy-7f682-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "washbuddy-7f682",
  storageBucket: "washbuddy-7f682.firebasestorage.app",
  messagingSenderId: "1048394628363",
  appId: "1:1048394628363:web:921118374f1d1e8b46b60e",
  measurementId: "G-LCPZ3CHBH4"
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