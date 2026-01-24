const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://vibe-35004-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

async function testDatabaseConnection() {
  console.log('🔍 Testing Firebase Realtime Database connection...');
  
  try {
    // 1. Create a test reference
    const testRef = db.ref('calls/admin/outgoing/connection-test');
    console.log('📌 Created test reference:', testRef.toString());

    // 2. Try to write data
    await testRef.push({
      timestamp: Date.now(),
      test: 'Connection test'
    });
    console.log('✅ Successfully wrote to database');

    // 3. Try to read the data back
    const snapshot = await testRef.get();
    console.log('📥 Read data:', snapshot.val());

    // 4. Clean up the test data
    await testRef.remove();
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

testDatabaseConnection().then(result => {
  console.log('Test result:', result);
  process.exit(result.success ? 0 : 1);
});
