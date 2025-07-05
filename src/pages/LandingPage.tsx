import React, { useState } from 'react';
import { SparklesIcon, UserIcon, PlusCircleIcon, LogInIcon } from '../components/icons';

interface LandingPageProps {
  onCreateRoom: (username: string, roomName:string) => void;
  onJoinRoom: (username: string, roomId: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [action, setAction] = useState<'create' | 'join' | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomName.trim()) {
      onCreateRoom(username.trim(), roomName.trim());
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && roomId.trim().length === 8) {
      onJoinRoom(username.trim(), roomId.trim());
    }
  };
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    // Reset subsequent choices if username is cleared
    if (newUsername.trim() === '') {
      setAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <SparklesIcon className="w-12 h-12 text-sky-500 mr-3"/>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-800">Wash Buddy</h1>
        </div>
        <p className="text-slate-600 text-base sm:text-lg">Your smart solution for dorm laundry.</p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg transition-all duration-500">
        <div className="mb-6">
          <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">Step 1: What's your name?</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                </span>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="Enter your name to begin"
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                    required
                    autoComplete="off"
                />
            </div>
        </div>
        
        <div className="min-h-[150px]">
            {username.trim() && !action && (
                <div className="border-t border-slate-200 pt-6">
                    <p className="text-center font-medium text-slate-700 mb-4">Step 2: Hi {username.trim()}! What's next?</p>
                    <div className="space-y-3">
                        <button onClick={() => setAction('create')} className="w-full flex items-center gap-3 text-left py-3 px-4 rounded-lg font-semibold transition-colors bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200">
                            <PlusCircleIcon className="w-6 h-6 flex-shrink-0"/>
                            <span>Create a New Laundry Room</span>
                        </button>
                        <button onClick={() => setAction('join')} className="w-full flex items-center gap-3 text-left py-3 px-4 rounded-lg font-semibold transition-colors bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200">
                            <LogInIcon className="w-6 h-6 flex-shrink-0"/>
                            <span>Join an Existing Room</span>
                        </button>
                    </div>
                </div>
            )}

            {action === 'create' && (
                <form onSubmit={handleCreate} className="border-t border-slate-200 pt-6">
                     <div className="mb-4">
                      <label htmlFor="roomName" className="block text-sm font-medium text-slate-700 mb-2">Step 3: Name Your Room</label>
                      <input
                          id="roomName"
                          type="text"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="e.g., Student Dorm New York"
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                          required
                          autoFocus
                      />
                    </div>
                    <button
                        type="submit"
                        disabled={!roomName.trim()}
                        className="w-full flex items-center justify-center bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-400"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2"/>
                        Confirm & Create Room
                    </button>
                </form>
            )}

            {action === 'join' && (
                <form onSubmit={handleJoin} className="border-t border-slate-200 pt-6">
                    <div className="mb-4">
                    <label htmlFor="roomId" className="block text-sm font-medium text-slate-700 mb-2">Step 3: Enter the 8-Digit Room Code</label>
                    <input
                        id="roomId"
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g., 12345678"
                        maxLength={8}
                        pattern="\d{8}"
                        title="Room code must be 8 digits."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                        required
                        autoFocus
                    />
                    </div>
                    <button
                        type="submit"
                        disabled={roomId.trim().length !== 8}
                        className="w-full flex items-center justify-center bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    >
                    <LogInIcon className="w-5 h-5 mr-2" />
                    Join Laundry Room
                    </button>
                </form>
            )}
        </div>
      </div>
       <footer className="w-full p-4 text-slate-500 text-sm mt-8">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="font-medium">Created by Nilesh Parshotam Rijhwani</p>
            <p>Wash Buddy &copy; 2024</p>
          </div>
          <a href="https://www.buymeacoffee.com/nileshRijhwani" target="_blank" rel="noopener noreferrer" title="Support the creator">
            <img 
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
                alt="Buy Me A Coffee" 
                style={{ height: '40px' }}
                className="rounded-lg shadow-sm hover:shadow-md transition-shadow"
            />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
