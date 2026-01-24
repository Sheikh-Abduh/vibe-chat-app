
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { 
  getDatabase, 
  type Database, 
  ref, 
  onValue, 
  onDisconnect, 
  set,
  serverTimestamp,
  type DataSnapshot 
} from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1x_MWgIJlEB8BToP2Mc7LLAZv0pPjtc8",
  authDomain: "vibe-35004.firebaseapp.com",
  databaseURL: "https://vibe-35004-default-rtdb.asia-southeast1.firebasedatabase.app", // Add Realtime Database URL
  projectId: "vibe-35004",
  storageBucket: "vibe-35004.appspot.com",
  messagingSenderId: "667054799663",
  appId: "1:667054799663:web:849dc655b5ef124d9fffda"
};

// Initialize Firebase
let app: FirebaseApp;
try {
  // Check if Firebase is already initialized
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

// Initialize services
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app);

// Initialize Realtime Database with correct region and configure persistence
const database: Database = getDatabase(app);

// Enable database features in browser environment
if (typeof window !== 'undefined') {
  // Enable logging only in development
  if (process.env.NODE_ENV === 'development') {
    const { enableLogging } = require('firebase/database');
    enableLogging(true);
  }
  
  // Set up presence system
  const connectedRef = ref(database, '.info/connected');
  
  // Monitor connection state
  onValue(connectedRef, (snap: DataSnapshot) => {
    if (snap.val()) {
      const auth = getAuth();
      if (auth.currentUser) {
        // When we disconnect, update the last online time
        const userStatusRef = ref(database, `users/${auth.currentUser.uid}/status`);
        onDisconnect(userStatusRef).set({
          lastOnline: serverTimestamp(),
          state: 'offline'
        });
      }
    }
  });
}

export { app, auth, db, functions, database };
