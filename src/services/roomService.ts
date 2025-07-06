import { ref, onValue, set, off, get } from "firebase/database";
import { db } from './firebase'; // Import the initialized database
import { Machine, MachineStatus, WashMode, RoomData } from '../types';

// --- SERVICE INTERFACE ---
interface RoomService {
    getRoomData(): Promise<RoomData>;
    updateRoomData(data: RoomData): Promise<void>;
    onDataChange(callback: (data: RoomData) => void): () => void; // Returns an unsubscribe function
    addPushSubscription(username: string, subscription: PushSubscription): Promise<void>;
    removePushSubscription(username: string, subscription: PushSubscription): Promise<void>;
    updateSubscription(username: string, type: 'washer' | 'dryer', isSubscribed: boolean): Promise<void>;
}

// --- FIREBASE REAL-TIME SERVICE ---

class FirebaseRoomService implements RoomService {
    private roomId: string;
    private roomRef;
    private initialRoomName: string;
    private subscribers: ((data: RoomData) => void)[] = [];
    private isListenerAttached = false;

    constructor(roomId: string, roomName: string) {
        this.roomId = roomId;
        this.initialRoomName = roomName;
        this.roomRef = ref(db, 'rooms/' + this.roomId);
    }
    
    // Fetches the initial data or creates it if it doesn't exist.
    async getRoomData(): Promise<RoomData> {
        try {
            const snapshot = await get(this.roomRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                return data as RoomData;
            } else {
                // If the room is new, set it up with defaults.
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
               
               await set(this.roomRef, initialData); // Persist the initial state
               return initialData;
            }
        } catch (error) {
            console.error("Error fetching room data from Firebase:", error);
            // Return a minimal empty state on error
            return { name: this.initialRoomName, machines: [], modes: [], members: {} };
        }
    }

    // Pushes the entire room data object to Firebase.
    async updateRoomData(data: RoomData): Promise<void> {
        try {
            await set(this.roomRef, data);
        } catch (error) {
            console.error("Error updating room data to Firebase:", error);
        }
    }
    
    // Subscribes a callback to real-time data changes.
    onDataChange(callback: (data: RoomData) => void): () => void {
        this.subscribers.push(callback);

        if (!this.isListenerAttached) {
            onValue(this.roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    this.subscribers.forEach(cb => cb(data));
                }
            });
            this.isListenerAttached = true;
        }

        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
            if (this.subscribers.length === 0) {
                 off(this.roomRef);
                 this.isListenerAttached = false;
            }
        };
    }

    async addPushSubscription(username: string, subscription: PushSubscription): Promise<void> {
        if (!username || !subscription.endpoint) return;
        const subAsJson = subscription.toJSON();
        // Sanitize the endpoint URL to use as a Firebase key
        if (!subAsJson.endpoint) {
            console.error("Push subscription endpoint is undefined.");
            return;
        }
        const key = subAsJson.endpoint.substring(0, 100).replace(/[.$#\[\]\/]/g, '_');
        const subscriptionRef = ref(db, `rooms/${this.roomId}/members/${username}/pushSubscriptions/${key}`);
        try {
            await set(subscriptionRef, subAsJson);
        } catch (error) {
            console.error("Failed to save push subscription:", error);
        }
    }

    async removePushSubscription(username: string, subscription: PushSubscription): Promise<void> {
        if (!username || !subscription.endpoint) return;
        const key = subscription.endpoint.substring(0, 100).replace(/[.$#\[\]\/]/g, '_');
        const subscriptionRef = ref(db, `rooms/${this.roomId}/members/${username}/pushSubscriptions/${key}`);
        try {
            await set(subscriptionRef, null); // Set to null to delete
        } catch (error) {
            console.error("Failed to remove push subscription:", error);
        }
    }
    
    async updateSubscription(username: string, type: 'washer' | 'dryer', isSubscribed: boolean): Promise<void> {
        if (!username) return;
        try {
            const subscriptionRef = ref(db, `rooms/${this.roomId}/members/${username}/subscriptions/${type}`);
            await set(subscriptionRef, isSubscribed);
        } catch (error) {
            console.error(`Failed to update subscription for ${type}:`, error);
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