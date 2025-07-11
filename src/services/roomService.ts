import { ref, onValue, set, off, get, update } from "firebase/database"; // ✨ Added 'update'
import { db } from './firebase'; 
import { Machine, MachineStatus, WashMode, RoomData, User } from '../types'; // ✨ Added 'User'

// --- SERVICE INTERFACE ---
interface RoomService {
    getRoomData(): Promise<RoomData>;
    updateRoomData(data: RoomData): Promise<void>;
    onDataChange(callback: (data: RoomData) => void): () => void;
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


// ✨ --- NEW FUNCTIONALITY FOR NOTIFICATIONS --- ✨

/**
 * Updates a user's profile within a room to save their FCM token.
 * This function is essential for sending targeted push notifications.
 * @param roomId - The ID of the room the user is in.
 * @param user - The user object containing their ID and username.
 * @param token - The FCM token to save. Can be `null` to delete a token.
 */
export const updateUserFcmToken = async (
  roomId: string,
  user: User,
  token: string | null
) => {
  // Ensure we have the necessary information before proceeding.
  if (!roomId || !user || !user.username) {
    console.error("Cannot update FCM token without roomId and user info.");
    return;
  }
  
  // Create a reference to the specific user's data inside the 'members' object of a room.
  const memberRef = ref(db, `rooms/${roomId}/members/${user.username}`);

  try {
    // Check if the member already exists in the database.
    const memberSnapshot = await get(memberRef);
    
    const memberData = {
      fcmToken: token,
      // You can add other user-specific info here if needed in the future
      // For example: lastSeen: Date.now()
    };
    
    if (memberSnapshot.exists()) {
      // If the member exists, just update their data with the new token.
      await update(memberRef, memberData);
    } else {
      // If the member doesn't exist, create a new entry for them.
      await set(memberRef, memberData);
    }
    
    console.log(`FCM token for user '${user.username}' has been updated.`);

  } catch (error) {
    console.error("Error saving FCM token to the database:", error);
  }
};