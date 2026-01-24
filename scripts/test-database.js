const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, get, remove } = require('firebase/database');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyA1x_MWgIJlEB8BToP2Mc7LLAZv0pPjtc8",
  authDomain: "vibe-35004.firebaseapp.com",
  databaseURL: "https://vibe-35004-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vibe-35004",
  storageBucket: "vibe-35004.appspot.com",
  messagingSenderId: "667054799663",
  appId: "1:667054799663:web:849dc655b5ef124d9fffda"
};

// You'll need to set environment variables for these:
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "testpass123";

async function testDatabaseConnection() {
  console.log('🔍 Testing Firebase Realtime Database connection...');
  
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);

    // 1. Sign in first
    console.log('🔑 Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    console.log('✅ Signed in as:', userCredential.user.email);

    // 2. Create a test reference
    const testRef = ref(database, `calls/${userCredential.user.uid}/outgoing/connection-test`);
    console.log('📌 Created test reference:', testRef.toString());

    // 2. Try to write data
    const pushRef = await push(testRef, {
      timestamp: Date.now(),
      test: 'Connection test'
    });
    console.log('✅ Successfully wrote to database');

    // 3. Try to read the data back
    const snapshot = await get(testRef);
    console.log('📥 Read data:', snapshot.val());

    // 4. Clean up the test data
    await remove(pushRef);
    console.log('🧹 Cleaned up test data');

    return {
      success: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('❌ Please set TEST_EMAIL and TEST_PASSWORD environment variables');
  process.exit(1);
}

testDatabaseConnection().then(result => {
  console.log('Test result:', result);
  process.exit(result.success ? 0 : 1);
});
