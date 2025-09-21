
// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore"; // Added Firestore import
import { getFunctions, type Functions } from "firebase/functions"; // Added Functions import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1x_MWgIJlEB8BToP2Mc7LLAZv0pPjtc8",
  authDomain: "vibe-35004.firebaseapp.com",
  projectId: "vibe-35004",
  storageBucket: "vibe-35004.appspot.com",
  messagingSenderId: "667054799663",
  appId: "1:667054799663:web:849dc655b5ef124d9fffda"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app); // Initialize Firestore
const functions: Functions = getFunctions(app); // Initialize Functions

export { app, auth, db, functions }; // Export db and functions
