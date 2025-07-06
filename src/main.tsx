import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register the service worker for Firebase Cloud Messaging
if ('serviceWorker' in navigator) {
  // The service worker is placed at the root by the build process
  const swUrl = `/firebase-messaging-sw.js`;
  navigator.serviceWorker.register(swUrl, { scope: '/' })
    .then(registration => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(err => {
      console.error('Service Worker registration failed:', err);
    });
}


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);