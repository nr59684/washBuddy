
// Import the VAPID public key from environment variables
const VAPID_PUBLIC_KEY = import.meta.env.VITE_APP_VAPID_PUBLIC_KEY;

const isIOS = () => {
    // Standard check for iOS devices
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

const isPushSupported = () => {
    try {
        return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    } catch (e) {
        return false;
    }
};

const isBadgingSupported = () => 'setAppBadge' in navigator;

const updateAppBadge = async (count: number) => {
    if (!isBadgingSupported()) return;
    try {
        if (count > 0) {
            await (navigator as any).setAppBadge(count);
        } else {
            await (navigator as any).clearAppBadge();
        }
    } catch (error) {
        console.error('Failed to set app badge.', error);
    }
};

// Function to request notification permission from the user
const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.warn("Notifications not supported in this browser.");
        return 'denied'; // Or a custom value indicating lack of support
    }
    return Notification.requestPermission();
};

// Function to subscribe the user to push notifications
const subscribeUser = async (): Promise<PushSubscription | null> => {
    if (!isPushSupported()) {
        console.warn("Push notifications not supported in this browser.");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            console.error("Service Worker not registered.");
            return null;
        }

        // Get the existing subscription if one exists
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            console.log('Existing subscription found.');
            return subscription;
        }

        console.log('No existing subscription, subscribing user.');

        // Subscribe the user
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Indicates that all push messages will trigger a notification
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        console.log('User subscribed:', subscription);
        // Here you would typically send this subscription object to your backend
        // sendSubscriptionToBackend(subscription); // Implement this function

        return subscription;
    } catch (error) {
        console.error('Failed to subscribe the user: ', error);
        return null;
    }
};

// Function to unsubscribe the user from push notifications
const unsubscribeUser = async (): Promise<boolean> => {
    if (!isPushSupported()) {
        console.warn("Push notifications not supported in this browser.");
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            console.log('User unsubscribed.');
            // Here you would typically inform your backend to remove this subscription
            // removeSubscriptionFromBackend(subscription); // Implement this function
            return true;
        }
        return false; // No active subscription found
    } catch (error) {
        console.error('Failed to unsubscribe the user: ', error);
        return false;
    }
};

const sendWebNotification = (title: string, options?: NotificationOptions) => {
    // Only attempt to send if permission has been granted.
    if ('Notification' in window && Notification.permission === 'granted') {
        const baseUrl = (import.meta as any).env.BASE_URL || '/';
        const iconPath = 'icons/icon-192x192.png';
        const iconUrl = `${baseUrl}${iconPath}`.replace('//', '/');
        
        // Using the service worker to display the notification is more robust
        // and is required on some platforms like Android.
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
                registration.showNotification(title, {
                    ...options,
                    icon: iconUrl,
                    badge: iconUrl,
                });
            } else {
                // Fallback for when SW isn't ready (less common but safe to have)
                new Notification(title, { ...options, icon: iconUrl, badge: iconUrl });
            }
        });
    }
};

// Helper function to convert a VAPID public key to a Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const notificationService = {
    isIOS,
    isPushSupported,
    isBadgingSupported,
    updateAppBadge,
    sendWebNotification, requestNotificationPermission, subscribeUser, unsubscribeUser,};