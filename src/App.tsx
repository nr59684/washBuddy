import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LaundryRoomPage from './pages/LaundryRoomPage';
import { User } from './types';
import { subscribeToPushNotifications } from './services/push';

// The user object stored in state and localStorage
interface StoredUser {
  username: string;
  roomId: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Check for existing user session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('washBuddyUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
    }
  }, []);
  
  // Listen for the PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    
    // Show the browser's installation prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA installation');
      } else {
        console.log('User dismissed the PWA installation');
      }
      // The prompt can only be used once. Clear it.
      setInstallPrompt(null);
    });
  };

  const getApiEndpoint = (path: string) => {
    if (import.meta.env.DEV) {
      return `/api/${path}`;
    }
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const region = 'europe-west1';
    return `https://${region}-${projectId}.cloudfunctions.net/${path}`;
  };

  const handleLoginAndCreateRoom = async (username: string, roomName: string) => {
    // Generate a new 8-digit room code
    const newRoomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // The roomName is now passed directly to the page to initialize the backend state
    const newUser: User = { username, roomId: newRoomId, roomName };
    try {
      localStorage.setItem('washBuddyUser', JSON.stringify({ username, roomId: newRoomId }));
      // We pass the full user object to the page component on first creation
      setUser(newUser); 
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        await fetch(getApiEndpoint('saveSubscription'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription, userId: username, roomId: newRoomId }),
        });
      }
    } catch (error) {
       console.error("Failed to save user to localStorage", error);
    }
  };

  const handleLoginAndJoinRoom = async (username: string, roomId: string) => {
    // The room name is no longer needed here; it will be fetched from the database.
    const newUser: StoredUser = { username, roomId };
     try {
      localStorage.setItem('washBuddyUser', JSON.stringify(newUser));
      setUser(newUser);
      const subscription = await subscribeToPushNotifications();
      if (subscription) {
        await fetch(getApiEndpoint('saveSubscription'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription, userId: username, roomId }),
        });
      }
    } catch (error) {
       console.error("Failed to save user to localStorage", error);
    }
  };
  
  const handleLogout = () => {
    try {
      localStorage.removeItem('washBuddyUser');
      setUser(null);
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };
  
  // The user object passed to the page now includes the initial room name on creation,
  // or a placeholder if joining. The page itself will handle displaying the synced name.
  const userForPage: User | undefined = user ? {
    ...user,
    roomName: (user as User).roomName || `Room #${user.roomId}`
  } : undefined;


  if (!userForPage) {
    return <LandingPage 
      onJoinRoom={handleLoginAndJoinRoom} 
      onCreateRoom={handleLoginAndCreateRoom} 
      installPrompt={installPrompt}
      onInstallClick={handleInstallClick}
    />;
  }

  return (
    <LaundryRoomPage
      user={userForPage}
      onLogout={handleLogout}
      installPrompt={installPrompt}
      onInstallClick={handleInstallClick}
    />
  );
};

export default App;
