

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Machine, MachineStatus, User, WashMode, RoomData } from '../types';
import Header from '../components/Header';
import MachineCard from '../components/MachineCard';
import Modal from '../components/Modal';
import { roomServiceFactory } from '../services/roomService';
import { PlusCircleIcon, WasherIcon, UsersIcon, UserIcon as MemberIcon, PlayIcon, BellIcon, SettingsIcon, TrashIcon, ClockIcon } from '../components/icons';

interface LaundryRoomPageProps {
  user: User;
  onLogout: () => void;
}

const LaundryRoomPage: React.FC<LaundryRoomPageProps> = ({ user, onLogout }) => {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineType, setNewMachineType] = useState<'washer' | 'dryer'>('washer');
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);

  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [machineToStart, setMachineToStart] = useState<Machine | null>(null);
  const [durationHours, setDurationHours] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  
  const [newModeName, setNewModeName] = useState('');
  const [newModeDuration, setNewModeDuration] = useState('');

  const [notificationPermission, setNotificationPermission] = useState('default');
  const [subscriptions, setSubscriptions] = useState<Set<'washer' | 'dryer'>>(() => {
    try {
        const saved = localStorage.getItem('washBuddySubs');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
        return new Set();
    }
  });

  const notificationTimers = useRef<{ [key: number]: number }>({});
  
  const roomService = useMemo(() => roomServiceFactory.getService(user.roomId, user.roomName), [user.roomId, user.roomName]);

  // Effect to save subscriptions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('washBuddySubs', JSON.stringify(Array.from(subscriptions)));
    } catch (error) {
        console.error("Could not save subscriptions to localStorage", error);
    }
  }, [subscriptions]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    // Log for debugging
    console.log(`Attempting to send notification. Permission: ${notificationPermission}`);
    if (notificationPermission === 'granted') {
      new Notification(title, { 
          ...options, 
          // Use a stable icon URL
          icon: 'https://i.imgur.com/O9N4p5p.png', 
          badge: 'https://i.imgur.com/O9N4p5p.png' 
        });
    }
  }, [notificationPermission]);
  
  // This refactoring solves the stale closure problem.
  // The effect now runs only once, and we use refs inside the callback
  // to ensure we always have the latest state.
  useEffect(() => {
    let isMounted = true;
    
    const roomDataRef = React.createRef<RoomData | null>();
    roomDataRef.current = roomData;
    const subscriptionsRef = React.createRef<Set<'washer' | 'dryer'>>();
    subscriptionsRef.current = subscriptions;

    const initRoom = async () => {
      const initialData = await roomService.getRoomData();
      if (isMounted) {
        setRoomData(initialData);
        setIsLoading(false);
      }
    };
    initRoom();
    
    const unsubscribe = roomService.onDataChange((newData) => {
        if (!isMounted) return;

        const prevData = roomDataRef.current;
        const currentSubs = subscriptionsRef.current;

        if (prevData && currentSubs) {
            // Check for washer availability
            const wasWasherBusy = prevData.machines.filter(m => m.type === 'washer').length > 0 && prevData.machines.filter(m => m.type === 'washer').every(m => m.status === 'In Use');
            const isWasherAvailableNow = newData.machines.some(m => m.type === 'washer' && m.status === 'Available');
            if (wasWasherBusy && isWasherAvailableNow && currentSubs.has('washer')) {
                sendNotification('Washer Available!', { body: 'A washing machine is now free.' });
                setSubscriptions(prev => { const s = new Set(prev); s.delete('washer'); return s; });
            }

            // Check for dryer availability
            const wasDryerBusy = prevData.machines.filter(m => m.type === 'dryer').length > 0 && prevData.machines.filter(m => m.type === 'dryer').every(m => m.status === 'In Use');
            const isDryerAvailableNow = newData.machines.some(m => m.type === 'dryer' && m.status === 'Available');
            if (wasDryerBusy && isDryerAvailableNow && currentSubs.has('dryer')) {
                sendNotification('Dryer Available!', { body: 'A dryer is now free.' });
                setSubscriptions(prev => { const s = new Set(prev); s.delete('dryer'); return s; });
            }
        }
        
        setRoomData(newData);
        if(isLoading) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [roomService, sendNotification]); // This now only depends on stable functions/objects.

  // Keep `notificationPermission` state up-to-date without causing effect re-runs
  useEffect(() => {
    setNotificationPermission(Notification.permission);
  }, []);
  
  // Display user object that is updated with the real room name once loaded
  const displayUser = useMemo(() => {
    if (roomData?.name && roomData.name !== user.roomName) {
        return { ...user, roomName: roomData.name };
    }
    return user;
  }, [user, roomData]);

  // Wrapper function to optimistically update local state and then push to the service
  const updateRoomAndService = (newRoomData: RoomData) => {
      setRoomData(newRoomData); // Optimistic update for snappy UI
      roomService.updateRoomData(newRoomData); // Push update to backend
  };

  const clearNotificationTimer = useCallback((machineId: number) => {
    if (notificationTimers.current[machineId]) {
      clearTimeout(notificationTimers.current[machineId]);
      delete notificationTimers.current[machineId];
    }
  }, []);

  const updateMachineStatus = useCallback((id: number, status: MachineStatus, options?: { durationMinutes?: number; username?: string; }) => {
    if (!roomData) return;
    
    const oldMachine = roomData.machines.find(m => m.id === id);
    const newMachines = roomData.machines.map(machine => {
      if (machine.id === id) {
        const finishTime = status === MachineStatus.InUse && options?.durationMinutes
          ? Date.now() + options.durationMinutes * 60 * 1000
          : null;
        
        const lastUsedBy = status === MachineStatus.InUse ? options?.username || machine.lastUsedBy : machine.lastUsedBy;
        
        if (status !== MachineStatus.InUse) clearNotificationTimer(id);
        
        return { ...machine, status, finishTime, lastUsedBy };
      }
      return machine;
    });

    const newRoomData = { ...roomData, machines: newMachines };
    updateRoomAndService(newRoomData);

    if (oldMachine && oldMachine.status !== status) {
        const newMachine = newMachines.find(m => m.id === id)!;
        if (status === MachineStatus.Finished) {
          sendNotification(`✅ ${newMachine.name} has finished!`, { body: 'Time to collect your laundry.' });
        }
    }
  }, [roomData, clearNotificationTimer, sendNotification]);
  
  const handleRequestNotificationPermission = async () => {
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      setNotificationPermission(Notification.permission);
      return Notification.permission;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };
  
  const handleSubscribe = async (type: 'washer' | 'dryer') => {
    const permission = await handleRequestNotificationPermission();
    if (permission !== 'granted') {
       alert("Please enable browser notifications to use this feature.");
       return;
    }
    setSubscriptions(prev => {
       const newSubs = new Set(prev);
       if (newSubs.has(type)) {
         newSubs.delete(type);
       } else {
         newSubs.add(type);
       }
       return newSubs;
    });
  };

  const schedulePreCompletionNotification = useCallback((machine: Machine, finishTime: number) => {
    const preCompletionTime = finishTime - 5 * 60 * 1000;
    const now = Date.now();

    if (preCompletionTime > now) {
      const timerId = window.setTimeout(() => {
        sendNotification(`⏳ ${machine.name} finishes in 5 mins!`, { body: "Don't forget to collect your laundry soon." });
      }, preCompletionTime - now);
      notificationTimers.current[machine.id] = timerId;
    }
  }, [sendNotification]);

  const handleStartMachineWithDuration = async (machine: Machine, totalMinutes: number) => {
      if (totalMinutes <= 0) return;

      const permission = await handleRequestNotificationPermission();
      if (permission === 'denied') {
          alert("You've blocked notifications. To get cycle alerts, please enable them in your browser settings.");
      }

      const finishTime = Date.now() + totalMinutes * 60 * 1000;
      updateMachineStatus(machine.id, MachineStatus.InUse, {
        durationMinutes: totalMinutes,
        username: user.username,
      });

      if (permission === 'granted') {
          schedulePreCompletionNotification(machine, finishTime);
      }
      
      setIsDurationModalOpen(false);
      setMachineToStart(null);
  };
  
  const handleModeSelect = (duration: number) => {
    if (!machineToStart) return;
    handleStartMachineWithDuration(machineToStart, duration);
  };
  
  const handleConfirmCustomStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineToStart) return;
    const hours = parseInt(durationHours, 10) || 0;
    const minutes = parseInt(durationMinutes, 10) || 0;
    const totalMinutes = (hours * 60) + minutes;
    handleStartMachineWithDuration(machineToStart, totalMinutes);
  };

  const requestStartMachine = useCallback((machine: Machine) => {
    setMachineToStart(machine);
    setDurationHours('');
    setDurationMinutes('');
    setIsDurationModalOpen(true);
  }, []);

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMachineName.trim() !== '' && roomData) {
        const newMachine: Machine = { id: Date.now(), name: newMachineName.trim(), type: newMachineType, status: MachineStatus.Available, finishTime: null, lastUsedBy: null, };
        const newMachines = [...roomData.machines, newMachine];
        updateRoomAndService({ ...roomData, machines: newMachines });
        setNewMachineName('');
        setNewMachineType('washer');
        setIsAddModalOpen(false);
    }
  };
  
  const handleAddMode = (e: React.FormEvent, type: 'washer' | 'dryer') => {
    e.preventDefault();
    if (!roomData) return;
    const name = newModeName.trim();
    const duration = parseInt(newModeDuration.trim(), 10);
    if (name && duration > 0) {
        const newMode: WashMode = { id: Date.now(), name, duration, type };
        const newModes = [...roomData.modes, newMode].sort((a,b) => a.duration - b.duration);
        updateRoomAndService({ ...roomData, modes: newModes });
        setNewModeName('');
        setNewModeDuration('');
    }
  };

  const handleDeleteMode = (id: number) => {
    if (!roomData) return;
    const newModes = roomData.modes.filter(mode => mode.id !== id);
    updateRoomAndService({ ...roomData, modes: newModes });
  };
  
  const requestDeleteMachine = useCallback((machine: Machine) => { setMachineToDelete(machine); }, []);
  const handleConfirmDelete = () => {
    if (machineToDelete && roomData) {
        clearNotificationTimer(machineToDelete.id);
        const newMachines = roomData.machines.filter(machine => machine.id !== machineToDelete.id);
        updateRoomAndService({ ...roomData, machines: newMachines });
        setMachineToDelete(null);
    }
  };
  
  const { roomMembers, allWashersBusy, allDryersBusy } = useMemo(() => {
      if (!roomData) return { roomMembers: [], allWashersBusy: false, allDryersBusy: false };
      const users = [...new Set(roomData.machines.map(m => m.lastUsedBy).filter((name): name is string => !!name))];
      const washers = roomData.machines.filter(m => m.type === 'washer');
      const dryers = roomData.machines.filter(m => m.type === 'dryer');
      const allWashersBusy = washers.length > 0 && washers.every(m => m.status === MachineStatus.InUse);
      const allDryersBusy = dryers.length > 0 && dryers.every(m => m.status === 'In Use');
      return { roomMembers: users, allWashersBusy, allDryersBusy };
  }, [roomData]);
  
  const machines = roomData?.machines ?? [];
  const washModes = roomData?.modes ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header user={displayUser} onLogout={onLogout} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div>
            <div className="flex justify-between items-center mb-4 gap-2">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center truncate">
                <WasherIcon className="w-8 h-8 mr-3 text-sky-600 flex-shrink-0" />
                <span className="truncate" title={roomData?.name}>{isLoading ? "Loading..." : roomData?.name}</span>
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg transition-colors" title="Room Settings">
                  <SettingsIcon className="w-5 h-5"/>
                  <span className="hidden sm:inline">Settings</span>
                </button>
                <button onClick={() => setIsMembersModalOpen(true)} className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg transition-colors" title="View room members">
                  <UsersIcon className="w-5 h-5"/>
                  <span className="hidden sm:inline">Members</span>
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors" title="Add a new machine">
                  <PlusCircleIcon className="w-5 h-5"/>
                  <span className="hidden sm:inline">Add Machine</span>
                </button>
              </div>
            </div>
            
             <div className="flex justify-center gap-4 mb-6">
                {allWashersBusy && (
                    <button 
                        onClick={() => handleSubscribe('washer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm border ${subscriptions.has('washer') ? 'bg-sky-600 text-white border-sky-700' : 'bg-white hover:bg-sky-50 text-sky-800 border-sky-300'}`}
                    >
                        <BellIcon className="w-5 h-5"/>
                        <span>{subscriptions.has('washer') ? 'Subscribed to Washers' : 'Notify when Washer is Free'}</span>
                    </button>
                )}
                {allDryersBusy && (
                     <button 
                        onClick={() => handleSubscribe('dryer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm border ${subscriptions.has('dryer') ? 'bg-sky-600 text-white border-sky-700' : 'bg-white hover:bg-sky-50 text-sky-800 border-sky-300'}`}
                    >
                        <BellIcon className="w-5 h-5"/>
                        <span>{subscriptions.has('dryer') ? 'Subscribed to Dryers' : 'Notify when Dryer is Free'}</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {machines.map(machine => (<MachineCard key={machine.id} machine={machine} user={user} onUpdateStatus={updateMachineStatus} onDelete={requestDeleteMachine} onRequestStart={requestStartMachine} />))}
              {machines.length === 0 && !isLoading && (
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12 px-6 bg-white rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-700">This Laundry Room is Empty</h3><p className="text-slate-500 mt-2">Click "Add Machine" to get started and add your first washer or dryer!</p>
                </div>
              )}
               {isLoading && (
                 <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12 px-6">
                    <h3 className="text-xl font-semibold text-slate-700 animate-pulse">Connecting to Room...</h3>
                </div>
               )}
            </div>
        </div>
      </main>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Machine"><form onSubmit={handleAddMachine}><div className="mb-4"><label htmlFor="machineName" className="block text-sm font-medium text-slate-700 mb-2">Machine Name</label><input id="machineName" type="text" value={newMachineName} onChange={(e) => setNewMachineName(e.target.value)} placeholder="e.g., Dryer 3" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition" required autoFocus /></div><div className="mb-6"><label className="block text-sm font-medium text-slate-700 mb-2">Machine Type</label><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="machineType" value="washer" checked={newMachineType === 'washer'} onChange={() => setNewMachineType('washer')} className="form-radio text-sky-600 focus:ring-sky-500"/><span className="font-medium text-slate-800">Washer</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="machineType" value="dryer" checked={newMachineType === 'dryer'} onChange={() => setNewMachineType('dryer')} className="form-radio text-sky-600 focus:ring-sky-500"/><span className="font-medium text-slate-800">Dryer</span></label></div></div><div className="flex justify-end gap-3"><button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Cancel</button><button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400" disabled={!newMachineName.trim()}>Save Machine</button></div></form></Modal>
      <Modal isOpen={!!machineToDelete} onClose={() => setMachineToDelete(null)} title="Confirm Deletion">{machineToDelete && ( <div> <p className="text-slate-600 mb-6">Are you sure you want to permanently delete <strong className="text-slate-800">{machineToDelete.name}</strong>? This action cannot be undone.</p><div className="flex justify-end gap-3"><button onClick={() => setMachineToDelete(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Cancel</button><button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">Delete</button></div></div>)}</Modal>
      <Modal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} title="Room Members">{roomMembers.length > 0 ? ( <ul className="space-y-3 max-h-80 overflow-y-auto">{roomMembers.map((memberName, index) => ( <li key={index} className="flex items-center bg-slate-50 p-3 rounded-md"><span className="flex items-center justify-center w-7 h-7 mr-3 rounded-full bg-slate-200 text-slate-600"><MemberIcon className="w-4 h-4" /></span><span className="font-medium text-slate-700">{memberName}</span></li>))}</ul>) : ( <p className="text-sm text-slate-500 text-center py-4">No one has used a machine in this room yet.</p>)}<div className="flex justify-end mt-6"><button onClick={() => setIsMembersModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Close</button></div></Modal>

      <Modal isOpen={isDurationModalOpen} onClose={() => setIsDurationModalOpen(false)} title={`Start ${machineToStart?.type === 'dryer' ? 'Drying Cycle' : 'Wash Cycle'}`}>
        {machineToStart && (
          <div>
            <div className="mb-6"><h3 className="text-lg font-semibold text-slate-800 mb-3 text-center">Select a Mode</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {washModes.filter(m => m.type === machineToStart.type).map(mode => (
                  <button key={mode.id} onClick={() => handleModeSelect(mode.duration)} className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-800 transition-colors shadow-sm">
                    <span className="font-bold text-base">{mode.name}</span>
                    <span className="text-sm text-slate-600 flex items-center gap-1"><ClockIcon className="w-4 h-4"/>{mode.duration} min</span>
                  </button>
                ))}
              </div>
              {washModes.filter(m => m.type === machineToStart.type).length === 0 && (<p className="text-center text-slate-500 py-4 italic">No modes defined for {machineToStart.type}s. Add some in Settings!</p>)}
            </div>
            <div className="flex items-center my-4"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink mx-4 text-slate-400 text-sm font-semibold">OR</span><div className="flex-grow border-t border-slate-200"></div></div>
            <form onSubmit={handleConfirmCustomStart}>
              <h3 className="text-lg font-semibold text-slate-800 mb-3 text-center">Set Custom Time</h3>
              <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="flex-1"><label htmlFor="duration-hours" className="block text-sm font-medium text-slate-700 mb-1">Hours</label><input id="duration-hours" type="number" min="0" max="23" value={durationHours} onChange={(e) => setDurationHours(e.target.value.replace(/\D/g, ''))} placeholder="0" className="w-full text-center px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition" autoFocus/></div>
                  <span className="text-2xl font-bold text-slate-400 pt-6">:</span>
                  <div className="flex-1"><label htmlFor="duration-minutes" className="block text-sm font-medium text-slate-700 mb-1">Minutes</label><input id="duration-minutes" type="number" min="0" max="59" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value.replace(/\D/g, ''))} placeholder="45" className="w-full text-center px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"/></div>
              </div>
              <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsDurationModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold transition-colors">Cancel</button>
                  <button type="submit" className="flex items-center justify-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed" disabled={(parseInt(durationHours, 10) || 0) <= 0 && (parseInt(durationMinutes, 10) || 0) <= 0 }><PlayIcon className="w-5 h-5 mr-2"/>{`Start ${machineToStart.type === 'dryer' ? 'Drying' : 'Wash'}`}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Room Settings & Modes">
        <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2">
            {[ 'washer', 'dryer' ].map(type => (
                <div key={type}>
                    <h3 className="capitalize text-lg font-semibold text-slate-800 border-b pb-2 mb-3">{type} Modes</h3>
                    <ul className="space-y-2 mb-4">
                        {washModes.filter(m => m.type === type).map(mode => (
                            <li key={mode.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                <div><span className="font-medium text-slate-700">{mode.name}</span><span className="text-sm text-slate-500 ml-2">({mode.duration} min)</span></div>
                                <button onClick={() => handleDeleteMode(mode.id)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full" title="Delete mode"><TrashIcon className="w-4 h-4" /></button>
                            </li>
                        ))}
                         {washModes.filter(m => m.type === type).length === 0 && <li className="text-center text-sm text-slate-500 py-2">No {type} modes defined.</li>}
                    </ul>
                    <form onSubmit={(e) => handleAddMode(e, type as 'washer' | 'dryer')} className="flex flex-col sm:flex-row gap-2 items-end bg-slate-100 p-3 rounded-lg">
                        <div className="flex-grow w-full sm:w-auto"><label className="text-xs font-medium text-slate-600 block mb-1">Mode Name</label><input type="text" placeholder="e.g., Delicates" value={newModeName} onChange={e => setNewModeName(e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:outline-none transition"/></div>
                        <div className="w-full sm:w-28"><label className="text-xs font-medium text-slate-600 block mb-1">Duration (min)</label><input type="number" min="1" placeholder="25" value={newModeDuration} onChange={e => setNewModeDuration(e.target.value.replace(/\D/g, ''))} className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:outline-none transition"/></div>
                        <button type="submit" disabled={!newModeName.trim() || !newModeDuration.trim()} className="w-full sm:w-auto px-4 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 transition-colors disabled:bg-slate-400">Add</button>
                    </form>
                </div>
            ))}
        </div>
        <div className="flex justify-end mt-6 border-t pt-4"><button onClick={() => setIsSettingsModalOpen(false)} className="px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold transition-colors">Close</button></div>
      </Modal>

      <footer className="p-4 text-slate-500 text-sm">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left"><p className="font-medium">Created by Nilesh Parshotam Rijhwani</p><p>Wash Buddy &copy; 2024</p></div>
          <a href="https://www.buymeacoffee.com/nileshRijhwani" target="_blank" rel="noopener noreferrer" title="Support the creator"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style={{ height: '40px' }} className="rounded-lg shadow-sm hover:shadow-md transition-shadow"/></a>
        </div>
      </footer>
    </div>
  );
};

export default LaundryRoomPage;