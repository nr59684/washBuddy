import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LaundryRoomPage from './pages/LaundryRoomPage';
import { User } from './types';

// The user object stored in state and localStorage
interface StoredUser {
  username: string;
  roomId: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<StoredUser | null>(null);

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
  
  const handleLoginAndCreateRoom = (username: string, roomName: string) => {
    // Generate a new 8-digit room code
    const newRoomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    // The roomName is now passed directly to the page to initialize the backend state
    const newUser: User = { username, roomId: newRoomId, roomName };
    try {
      localStorage.setItem('washBuddyUser', JSON.stringify({ username, roomId: newRoomId }));
      // We pass the full user object to the page component on first creation
      setUser(newUser); 
    } catch (error) {
       console.error("Failed to save user to localStorage", error);
    }
  };

  const handleLoginAndJoinRoom = (username: string, roomId: string) => {
    // The room name is no longer needed here; it will be fetched from the database.
    const newUser: StoredUser = { username, roomId };
     try {
      localStorage.setItem('washBuddyUser', JSON.stringify(newUser));
      setUser(newUser);
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
    return <LandingPage onJoinRoom={handleLoginAndJoinRoom} onCreateRoom={handleLoginAndCreateRoom} />;
  }

  return <LaundryRoomPage user={userForPage} onLogout={handleLogout} />;
};

export default App;
