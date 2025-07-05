
const isIOS = () => {
    // Standard check for iOS devices
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

const isPushSupported = () => {
    try {
        // Push notifications are not supported on iOS web, so we explicitly check for that.
        return 'Notification' in window && 'serviceWorker' in navigator && !isIOS();
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

export const notificationService = {
    isIOS,
    isPushSupported,
    isBadgingSupported,
    updateAppBadge,
    sendWebNotification,
};
