
// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// Removed: import { getStorage, type FirebaseStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANT: For a real application, you should store these in environment variables (e.g., .env.local)
// and access them via process.env.NEXT_PUBLIC_FIREBASE_API_KEY, etc.
// Storing them directly in code is a security risk.
const firebaseConfig = {
  apiKey: "AIzaSyA1x_MWgIJlEB8BToP2Mc7LLAZv0pPjtc8",
  authDomain: "vibe-35004.firebaseapp.com",
  projectId: "vibe-35004",
  storageBucket: "vibe-35004.appspot.com", // Ensure this is correct, often ends with .appspot.com
  messagingSenderId: "667054799663",
  appId: "1:667054799663:web:849dc655b5ef124d9fffda"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
// Removed: const storage: FirebaseStorage = getStorage(app);

export { app, auth };
// Removed storage from exports
