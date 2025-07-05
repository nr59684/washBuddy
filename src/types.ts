export enum MachineStatus {
  Available = 'Available',
  InUse = 'In Use',
  Finished = 'Finished',
  OutOfService = 'Out of Service',
}

export interface Machine {
  id: number;
  name: string;
  type: 'washer' | 'dryer';
  status: MachineStatus;
  finishTime: number | null;
  lastUsedBy: string | null;
}

export interface User {
  username: string;
  roomId: string;
  roomName: string;
}

export interface WashMode {
  id: number;
  name: string;
  duration: number; // in minutes
  type: 'washer' | 'dryer';
}

export interface Member {
  tokens: { [token: string]: boolean }; // Using keys for easy add/remove of tokens
  subscriptions: {
    washer: boolean;
    dryer: boolean;
  };
}

export interface RoomData {
  name: string;
  machines: Machine[];
  modes: WashMode[];
  members: { [username: string]: Member };
}