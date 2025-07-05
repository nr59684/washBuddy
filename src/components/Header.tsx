import React, { useState } from 'react';
import { SparklesIcon, LogOutIcon, CopyIcon, CheckIcon, ShareIcon } from './icons';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [copied, setCopied] = useState(false);

  const copyRoomId = () => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(user.roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        });
    }
  };
  
  const handleShare = async () => {
    // Construct a clean, canonical URL. `window.location.href` can be problematic
    // in some PWA contexts, leading to an "Invalid URL" error.
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;

    const shareData = {
      title: 'Wash Buddy Room Invite',
      text: `Join my laundry room "${user.roomName}" on Wash Buddy! The room code is: ${user.roomId}`,
      url: cleanUrl,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        // The user canceling the share dialog is not an error we need to log.
        if (err.name !== 'AbortError') {
          console.error("Couldn't share the room code:", err);
        }
      }
    } else {
        // Fallback for browsers that don't support the share API
        copyRoomId();
        alert(`Room code ${user.roomId} copied to clipboard! Share it with your friends.`);
    }
  };


  return (
    <header className="bg-sky-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
            <SparklesIcon className="w-8 h-8 mr-3 text-sky-200"/>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Wash Buddy
            </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-sky-700/50 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-medium text-sky-200">Room Code:</span>
                <span className="font-mono font-bold text-white tracking-wider">{user.roomId}</span>
                <button onClick={copyRoomId} className="text-sky-200 hover:text-white p-1 rounded-full" title="Copy Room Code">
                    {copied ? <CheckIcon className="w-4 h-4"/> : <CopyIcon className="w-4 h-4"/>}
                </button>
                 <button onClick={handleShare} className="text-sky-200 hover:text-white p-1 rounded-full" title="Share Room Code">
                    <ShareIcon className="w-4 h-4"/>
                </button>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg font-semibold transition-colors">
                <LogOutIcon className="w-5 h-5" />
                <span className="hidden md:inline">Leave</span>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;