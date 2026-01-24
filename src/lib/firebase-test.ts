"use client";

import { ref, push, remove, get } from 'firebase/database';
import { database } from './firebase';

export async function testDatabaseConnection() {
  console.log('🔍 Testing Firebase Realtime Database connection...');
  
  try {
    // 1. Create a test reference
    const testRef = ref(database, 'connection-test');
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
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error);
    return {
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        stack: error.stack
      }
    };
  }
}
