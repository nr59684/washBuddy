
import React from 'react';
import { MachineStatus } from '../types';

interface WashingMachineProps {
  status: MachineStatus;
}

const WashingMachine: React.FC<WashingMachineProps> = ({ status }) => {
  const isRunning = status === MachineStatus.InUse;
  const isOpen = status === MachineStatus.Available || status === MachineStatus.Finished;
  
  const machineClasses = [
    'w-full',
    'h-full',
    'transition-all duration-500',
    isRunning ? 'machine-running' : '',
  ].join(' ');

  const doorClasses = [
    'origin-[0%_50%]', // Hinge on the left
    'transition-transform duration-500 ease-in-out',
    isOpen ? 'door-open' : '',
  ].join(' ');

  return (
    <div className={machineClasses}>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* Machine Body */}
        <rect x="5" y="5" width="110" height="110" rx="10" ry="10" className="fill-slate-200 stroke-slate-300" strokeWidth="2"/>
        <rect x="10" y="10" width="100" height="15" rx="3" ry="3" className="fill-slate-700"/>

        {/* Control Panel */}
        <circle cx="95" cy="17.5" r="5" className="fill-slate-500" />
        <rect x="15" y="14" width="40" height="7" rx="2" className="fill-sky-500/50" />

        {/* Empty Drum visible when door is open */}
        {isOpen && (
            <g>
                {/* Drum Cavity (dark background) */}
                <circle cx="65" cy="65" r="33" className="fill-slate-800" />
                {/* Inner metallic drum surface */}
                <circle cx="65" cy="65" r="30" className="fill-slate-500" />
                {/* Drum perforations */}
                <g className="fill-slate-800">
                    <circle cx="65" cy="45" r="1.5" />
                    <circle cx="53" cy="50" r="1.5" />
                    <circle cx="77" cy="50" r="1.5" />
                    <circle cx="48" cy="60" r="1.5" />
                    <circle cx="82" cy="60" r="1.5" />
                    <circle cx="48" cy="70" r="1.5" />
                    <circle cx="82" cy="70" r="1.5" />
                    <circle cx="53" cy="80" r="1.5" />
                    <circle cx="77" cy="80" r="1.5" />
                    <circle cx="65" cy="85" r="1.5" />
                </g>
            </g>
        )}

        {/* Door hinge point for perspective */}
        <g transform="translate(15, 0)">
            {/* Door itself */}
            <g className={doorClasses}>
                {/* Door Outer Ring */}
                <circle cx="50" cy="65" r="35" className="fill-slate-300 stroke-slate-400" strokeWidth="2" />
                {/* Door Inner Ring (Glass) */}
                <circle cx="50" cy="65" r="30" className="fill-sky-200/50 opacity-50" />

                {/* Handle */}
                <path d="M 85 65 A 5 5 0 0 1 85 65" className="fill-none stroke-slate-500" strokeWidth="3" strokeLinecap="round" transform="rotate(45 85 65)"/>

                {/* Door is closed, show inside */}
                {!isOpen && (
                    <g className="drum-content" style={{ transformOrigin: '50px 65px' }}>
                        {/* Static back of the drum */}
                        <circle cx="50" cy="65" r="28" className="fill-slate-400" />
                        
                        {/* Spinning part */}
                        <g>
                           {/* Water/bubbles */}
                            <path d="M 30 75 Q 50 85, 70 75 T 30 75" className="fill-sky-400 opacity-60 water" />
                            <circle cx="35" cy="60" r="3" className="fill-white/80 water" style={{ animationDelay: '0.2s' }} />
                            <circle cx="60" cy="55" r="2" className="fill-white/80 water" style={{ animationDelay: '0.5s' }} />
                            {/* Clothes representation */}
                            <path d="M 40 50 Q 50 40, 60 50 T 70 60 Q 60 70, 50 60 T 40 50" className="fill-red-400/70" />
                            <path d="M 45 70 Q 55 80, 65 70 T 55 60 Q 45 50, 45 70" className="fill-blue-400/70" />
                        </g>
                    </g>
                )}
            </g>
        </g>
      </svg>
    </div>
  );
};

export default WashingMachine;
