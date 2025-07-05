import firebase from 'firebase/compat/app';
import { db } from './firebase'; // Import the initialized database
import { Machine, MachineStatus, WashMode, RoomData, Member } from '../types';

// --- SERVICE INTERFACE ---
interface RoomService {
    getRoomData(): Promise<RoomData>;
    updateRoomData(data: RoomData): Promise<void>;
    onDataChange(callback: (data: RoomData) => void): () => void; // Returns an unsubscribe function
    registerUser(username: string): Promise<void>;
    addUserToken(username: string, token: string): Promise<void>;
    updateUserSubscriptions(username: string, subs: { washer?: boolean, dryer?: boolean }): Promise<void>;
}

// --- FIREBASE REAL-TIME SERVICE ---

class FirebaseRoomService implements RoomService {
    private roomId: string;
    private roomRef: firebase.database.Reference;
    private initialRoomName: string;
    private subscribers: ((data: RoomData) => void)[] = [];
    private isListenerAttached = false;
    private firebaseListener: ((snapshot: firebase.database.DataSnapshot) => void) | null = null;


    constructor(roomId: string, roomName: string) {
        this.roomId = roomId;
        this.initialRoomName = roomName;
        this.roomRef = db.ref('rooms/' + this.roomId);
    }
    
    async getRoomData(): Promise<RoomData> {
        try {
            const snapshot = await this.roomRef.get();
            if (snapshot.exists()) {
                return snapshot.val() as RoomData;
            } else {
                const defaultMachines: Machine[] = [
                   { id: 1, name: 'Washer 1', type: 'washer', status: MachineStatus.Available, finishTime: null, lastUsedBy: null },
                   { id: 2, name: 'Washer 2', type: 'washer', status: MachineStatus.Available, finishTime: null, lastUsedBy: null },
                   { id: 3, name: 'Dryer 1', type: 'dryer', status: MachineStatus.Available, finishTime: null, lastUsedBy: null },
                ];
               const defaultModes: WashMode[] = [
                   { id: 1, name: 'Quick Wash', duration: 30, type: 'washer' },
                   { id: 2, name: 'Normal Wash', duration: 45, type: 'washer' },
                   { id: 3, name: 'Quick Dry', duration: 40, type: 'dryer' },
               ];
               const initialData: RoomData = {
                 name: this.initialRoomName,
                 machines: defaultMachines,
                 modes: defaultModes,
                 members: {},
               };
               
               await this.updateRoomData(initialData);
               return initialData;
            }
        } catch (error) {
            console.error("Error fetching room data from Firebase:", error);
            const fallbackData: RoomData = { name: this.initialRoomName, machines: [], modes: [], members: {} };
            return fallbackData;
        }
    }

    async updateRoomData(data: RoomData): Promise<void> {
        try {
            await this.roomRef.set(data);
        } catch (error) {
            console.error("Error updating room data to Firebase:", error);
        }
    }
    
    onDataChange(callback: (data: RoomData) => void): () => void {
        this.subscribers.push(callback);

        if (!this.isListenerAttached) {
            this.firebaseListener = (snapshot: firebase.database.DataSnapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val() as RoomData;
                    this.subscribers.forEach(cb => cb(data));
                }
            };
            this.roomRef.on('value', this.firebaseListener);
            this.isListenerAttached = true;
        }

        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
            if (this.subscribers.length === 0 && this.firebaseListener) {
                 this.roomRef.off('value', this.firebaseListener);
                 this.isListenerAttached = false;
                 this.firebaseListener = null;
            }
        };
    }

    async registerUser(username: string): Promise<void> {
        const userRef = db.ref(`rooms/${this.roomId}/members/${username}`);
        try {
            const snapshot = await userRef.get();
            if (!snapshot.exists()) {
                const initialMemberData: Member = {
                    tokens: {},
                    subscriptions: { washer: false, dryer: false },
                };
                await userRef.set(initialMemberData);
            }
        } catch (error) {
            console.error("Failed to register user:", error);
        }
    }

    async addUserToken(username: string, token: string): Promise<void> {
        const tokenPath = `members/${username}/tokens/${token}`;
        const updates = { [tokenPath]: true };
        try {
            await this.roomRef.update(updates);
        } catch (error) {
            console.error("Failed to add user token:", error);
        }
    }

    async updateUserSubscriptions(username: string, subs: { washer?: boolean, dryer?: boolean }): Promise<void> {
        const subsPath = `members/${username}/subscriptions`;
        try {
            await this.roomRef.child(subsPath).update(subs);
        } catch (error) {
            console.error("Failed to update subscriptions:", error);
        }
    }
}


// --- FACTORY ---
const services: { [roomId: string]: RoomService } = {};

export const roomServiceFactory = {
    getService: (roomId: string, roomName: string): RoomService => {
        if (!services[roomId]) {
            services[roomId] = new FirebaseRoomService(roomId, roomName);
        }
        return services[roomId];
    }
};