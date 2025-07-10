importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.5.0/firebase-messaging-compat.js');

// Placeholder for injected Firebase configuration
// This will be replaced by the build process
const firebaseConfig = self.__FIREBASE_CONFIG__; // Use a unique global variable name

// Initialize the Firebase app if the config is provided
if (firebaseConfig) {
  firebase.initializeApp(firebaseConfig);
}


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