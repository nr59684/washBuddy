
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// Use Vite's standard `import.meta.env` to access environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- DO NOT EDIT BELOW THIS LINE ---

let app: firebase.app.App;
let db: firebase.database.Database;

if (!firebaseConfig.apiKey) {
    document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; margin: 2rem; border-radius: 8px;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Firebase Configuration Missing</h1>
      <p style="margin-bottom: 1rem;">The Firebase credentials were not found. If you are developing locally, please ensure you have a <strong style="font-family: monospace;">.env</strong> file in your project root with your credentials.</p>
      <p>If you are seeing this on a live site, the repository secrets may not have been configured correctly for the deployment workflow.</p>
    </div>
  `;
  throw new Error("Firebase config is not set. Check your .env file or repository secrets.");
}

try {
  app = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  
  // Use Vite's built-in `import.meta.env.DEV` to check for development mode.
  if (import.meta.env.DEV) {
    console.log('DEV mode: Connecting to local Firebase emulators.');
    db.useEmulator('localhost', 9000); 
  }

} catch (error: any) {
  document.body.innerHTML = `
    <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; margin: 2rem; border-radius: 8px;">
      <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Firebase Initialization Failed</h1>
      <p style="margin-bottom: 1rem;">Please double-check your credentials.</p>
      <p>The <strong>databaseURL</strong> is often required and must be copied from the <strong>Realtime Database</strong> section of the Firebase Console.</p>
      <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #f1b0b7;" />
      <p style="font-family: monospace; font-size: 0.8rem; color: #491217;">Original Error: ${error.message}</p>
    </div>
  `;
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

export { app, db };
