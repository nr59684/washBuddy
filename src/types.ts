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
  // Use a map to store multiple push subscriptions per user, keyed by endpoint.
  pushSubscriptions?: { [endpoint: string]: PushSubscriptionJSON };
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
