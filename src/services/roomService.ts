import { getDatabase, ref, onValue, set, off, get } from "firebase/database";
import { db } from './firebase'; // Import the initialized database
import { Machine, MachineStatus, WashMode, RoomData } from '../types';

// --- SERVICE INTERFACE ---
interface RoomService {
    getRoomData(): Promise<RoomData>;
    updateRoomData(data: RoomData): Promise<void>;
    onDataChange(callback: (data: RoomData) => void): () => void; // Returns an unsubscribe function
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
        // CORRECTED: Use the imported 'db' instance instead of calling getDatabase() again.
        this.roomRef = ref(db, 'rooms/' + this.roomId);
    }
    
    // Fetches the initial data or creates it if it doesn't exist.
    async getRoomData(): Promise<RoomData> {
        try {
            const snapshot = await get(this.roomRef);
            if (snapshot.exists()) {
                return snapshot.val() as RoomData;
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
               };
               
               await this.updateRoomData(initialData); // Persist the initial state
               return initialData;
            }
        } catch (error) {
            console.error("Error fetching room data from Firebase:", error);
            // Return a minimal empty state on error
            return { name: this.initialRoomName, machines: [], modes: [] };
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

        // Only attach one listener to Firebase, even with multiple subscribers.
        if (!this.isListenerAttached) {
            onValue(this.roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val() as RoomData;
                    // Notify all subscribers of the new data.
                    this.subscribers.forEach(cb => cb(data));
                }
            });
            this.isListenerAttached = true;
        }

        // Return an unsubscribe function.
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
            // If there are no more subscribers, we could detach the listener,
            // but for simplicity, we'll leave it attached for the app's lifecycle.
            if (this.subscribers.length === 0) {
                 off(this.roomRef);
                 this.isListenerAttached = false;
            }
        };
    }
}


// --- FACTORY ---
// This allows us to have a single instance of the service per room ID.
const services: { [roomId: string]: RoomService } = {};

export const roomServiceFactory = {
    getService: (roomId: string, roomName: string): RoomService => {
        if (!services[roomId]) {
            services[roomId] = new FirebaseRoomService(roomId, roomName);
        }
        return services[roomId];
    }
};