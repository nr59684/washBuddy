import React, { useState, useEffect, useMemo } from 'react';
import { Machine, MachineStatus, User } from '../types';
import { CheckCircleIcon, PlayIcon, RefreshCwIcon, TrashIcon, WrenchIcon, UserIcon } from './icons';
import WashingMachine from './WashingMachine';

interface MachineCardProps {
  machine: Machine;
  user: User;
  onUpdateStatus: (id: number, status: MachineStatus, options?: { durationMinutes?: number; username?: string; }) => void;
  onDelete: (machine: Machine) => void;
  onRequestStart: (machine: Machine) => void;
}

const MachineCard: React.FC<MachineCardProps> = ({ machine, onUpdateStatus, onDelete, onRequestStart }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const isOutOfService = machine.status === MachineStatus.OutOfService;

  useEffect(() => {
    if (machine.status !== MachineStatus.InUse || !machine.finishTime) {
      setTimeLeft('');
      return;
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = machine.finishTime! - now;

      if (remaining <= 0) {
        setTimeLeft('00:00');
        clearInterval(intervalId);
        if (machine.status === MachineStatus.InUse) {
            onUpdateStatus(machine.id, MachineStatus.Finished);
        }
      } else {
        const minutes = Math.floor((remaining / 1000 / 60) % 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [machine.status, machine.finishTime, machine.id, onUpdateStatus]);

  const handleActionClick = () => {
    switch (machine.status) {
      case MachineStatus.Available:
        onRequestStart(machine);
        break;
      case MachineStatus.InUse:
        onUpdateStatus(machine.id, MachineStatus.Finished);
        break;
      case MachineStatus.Finished:
        onUpdateStatus(machine.id, MachineStatus.Available);
        break;
      // No action for Out of Service on main button
    }
  };

  const toggleOutOfService = () => {
    if (isOutOfService) {
      onUpdateStatus(machine.id, MachineStatus.Available);
    } else if (machine.status === MachineStatus.Available) {
      onUpdateStatus(machine.id, MachineStatus.OutOfService);
    }
  };

  const handleDelete = () => {
    onDelete(machine);
  };

  const isServiceToggleDisabled = ![MachineStatus.Available, MachineStatus.OutOfService].includes(machine.status);

  const MainActionButtonIcon = useMemo(() => {
    switch (machine.status) {
        case MachineStatus.Available: return <PlayIcon className="w-5 h-5 mr-2" />;
        case MachineStatus.InUse: return <CheckCircleIcon className="w-5 h-5 mr-2" />;
        case MachineStatus.Finished: return <RefreshCwIcon className="w-5 h-5 mr-2" />;
        default: return <WrenchIcon className="w-5 h-5 mr-2" />;
    }
  }, [machine.status]);

  const actionConfig = useMemo(() => {
     switch (machine.status) {
        case MachineStatus.Available:
          const startText = machine.type === 'dryer' ? 'Start Drying' : 'Start Wash';
          return { text: startText, style: 'bg-green-500 hover:bg-green-600' };
        case MachineStatus.InUse: return { text: 'Mark as Finished', style: 'bg-orange-500 hover:bg-orange-600' };
        case MachineStatus.Finished: return { text: 'Clear & Make Available', style: 'bg-sky-500 hover:bg-sky-600' };
        default: return { text: 'Out of Service', style: 'bg-slate-400' };
     }
  }, [machine.status, machine.type]);


  return (
    <div className={`group transition-all duration-300 bg-white rounded-xl shadow-md overflow-hidden flex flex-col ${isOutOfService ? 'saturate-50' : ''}`}>
      {/* Header with name and action buttons */}
      <div className="flex justify-between items-center p-2 sm:p-3 border-b border-slate-200">
        <h3 className="font-semibold text-base sm:text-lg text-slate-800 truncate" title={machine.name}>{machine.name}</h3>
        <div className="flex items-center gap-2">
           <button onClick={toggleOutOfService} disabled={isServiceToggleDisabled} className="p-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title={isOutOfService ? "Mark as Repaired" : "Mark as Out of Service"}>
              <WrenchIcon className="w-5 h-5"/>
          </button>
          <button onClick={handleDelete} className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-colors" title="Delete Machine">
              <TrashIcon className="w-5 h-5"/>
          </button>
        </div>
      </div>

      {/* Machine and Status Overlay Area */}
      <div className="relative w-full aspect-square bg-slate-100">
        <WashingMachine status={machine.status} />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
            {machine.status === MachineStatus.InUse && (
              <div className="bg-black/50 backdrop-blur-sm text-white rounded-lg p-3">
                <p className="text-xs uppercase tracking-wider">Time Left</p>
                <p className="text-3xl font-mono font-bold">{timeLeft}</p>
              </div>
            )}
            {machine.status === MachineStatus.Finished && (
              <div className="bg-sky-500 text-white rounded-lg px-4 py-2 shadow-lg">
                <p className="font-bold">Cycle Complete!</p>
                <p className="text-xs">Ready for pickup.</p>
              </div>
            )}
             {isOutOfService && (
               <div className="bg-slate-700/80 backdrop-blur-sm text-white rounded-lg p-3 shadow-lg">
                <p className="text-lg font-bold">Out of Service</p>
              </div>
             )}
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="p-2 sm:p-3 border-t border-slate-200 space-y-2">
          {machine.lastUsedBy && (
          <div className="text-center flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
              <UserIcon className="w-4 h-4"/>
              <span>
                  {machine.status === MachineStatus.Available || machine.status === MachineStatus.OutOfService ? 'Last used by' : 'Started by'}:
                  <strong className="font-semibold text-slate-800 ml-1">{machine.lastUsedBy}</strong>
              </span>
          </div>
          )}

          <button
            onClick={handleActionClick}
            disabled={isOutOfService}
            className={`w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-md text-white font-semibold transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed ${actionConfig.style}`}
          >
            {MainActionButtonIcon}
            {actionConfig.text}
          </button>
      </div>
    </div>
  );
};

export default MachineCard;