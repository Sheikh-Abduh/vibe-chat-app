"use client";

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { auth, database, db } from '@/lib/firebase';
import { ref, set, onValue, remove, get } from 'firebase/database';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function DebugCallSystem() {
  const [user, loading, error] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [logs, setLogs] = useState<string[]>([]);
  const [testStep, setTestStep] = useState(0);
  const [globalManagerActive, setGlobalManagerActive] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  // Add a log message
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[DEBUG] ${message}`);
  };

  // Check if GlobalCallManager is active
  useEffect(() => {
    const checkGlobalManager = () => {
      const isActive = !!(window as any).globalCallManagerActive;
      setGlobalManagerActive(isActive);
      addLog(`GlobalCallManager active: ${isActive}`);
    };

    checkGlobalManager();
    const interval = setInterval(checkGlobalManager, 2000);
    return () => clearInterval(interval);
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      addLog(`Notification permission: ${permission}`);
    } catch (error) {
      addLog(`Error requesting notification permission: ${error}`);
    }
  };

  // Test Step 1: Check Firebase initialization
  const testFirebaseInit = async () => {
    try {
      addLog('=== Testing Firebase Initialization ===');
      
      // Check if database is initialized
      if (database) {
        addLog('✅ Firebase Realtime Database initialized');
      } else {
        addLog('❌ Firebase Realtime Database not initialized');
        return;
      }
      
      // Check if Firestore is initialized
      if (db) {
        addLog('✅ Firestore initialized');
      } else {
        addLog('❌ Firestore not initialized');
        return;
      }
      
      addLog('✅ Firebase initialization test passed');
      setTestStep(1);
    } catch (error: any) {
      addLog(`❌ Firebase initialization test failed: ${error.message}`);
    }
  };

  // Test Step 2: Check user authentication
  const testUserAuth = async () => {
    try {
      addLog('=== Testing User Authentication ===');
      
      if (!user) {
        addLog('❌ No authenticated user found');
        return;
      }
      
      addLog(`✅ User authenticated: ${user.uid}`);
      addLog(`✅ User email: ${user.email}`);
      
      // Try to fetch user document
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          addLog('✅ User document found in Firestore');
        } else {
          addLog('⚠️ User document not found in Firestore');
        }
      } catch (error) {
        addLog(`⚠️ Error fetching user document: ${error}`);
      }
      
      addLog('✅ User authentication test passed');
      setTestStep(2);
    } catch (error: any) {
      addLog(`❌ User authentication test failed: ${error.message}`);
    }
  };

  // Test Step 3: Test database connectivity
  const testDatabaseConnectivity = async () => {
    try {
      addLog('=== Testing Database Connectivity ===');
      
      if (!user) {
        addLog('❌ No authenticated user');
        return;
      }
      
      // Test write to database
      const testRef = ref(database, `test/${user.uid}`);
      await set(testRef, {
        timestamp: Date.now(),
        message: 'Connectivity test'
      });
      addLog('✅ Database write test successful');
      
      // Test read from database
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        addLog('✅ Database read test successful');
        addLog(`✅ Read data: ${JSON.stringify(snapshot.val())}`);
      } else {
        addLog('⚠️ Database read test: No data found');
      }
      
      // Clean up test data
      await remove(testRef);
      addLog('✅ Test data cleaned up');
      
      addLog('✅ Database connectivity test passed');
      setTestStep(3);
    } catch (error: any) {
      addLog(`❌ Database connectivity test failed: ${error.message}`);
    }
  };

  // Test Step 4: Send test call signal
  const testSendCallSignal = async () => {
    try {
      addLog('=== Testing Call Signal Sending ===');
      
      if (!user) {
        addLog('❌ No authenticated user');
        return;
      }
      
      if (!receiverId) {
        addLog('❌ No receiver ID specified');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter a receiver ID"
        });
        return;
      }
      
      addLog(`Sending ${callType} call to: ${receiverId}`);
      
      const signal = {
        callerId: user.uid,
        callerName: user.displayName || user.email?.split('@')[0] || 'Test User',
        callerAvatar: user.photoURL || undefined,
        callType,
        timestamp: Date.now(),
        status: 'ringing'
      };

      // Send call signal to receiver
      const callRef = ref(database, `calls/${receiverId}/incoming`);
      await set(callRef, signal);
      addLog(`✅ Call signal sent successfully to: ${receiverId}`);
      addLog(`✅ Signal data: ${JSON.stringify(signal)}`);
      
      addLog('✅ Call signal sending test passed');
      setTestStep(4);
    } catch (error: any) {
      addLog(`❌ Call signal sending test failed: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Test Step 5: Listen for incoming calls
  const testListenForCalls = async () => {
    try {
      addLog('=== Testing Incoming Call Listener ===');
      
      if (!user) {
        addLog('❌ No authenticated user');
        return;
      }
      
      addLog(`Setting up call listener for user: ${user.uid}`);
      addLog(`Listening on path: calls/${user.uid}/incoming`);
      
      const incomingCallRef = ref(database, `calls/${user.uid}/incoming`);
      
      // Set up listener with timeout
      const unsubscribe = onValue(incomingCallRef, (snapshot) => {
        const data = snapshot.val();
        addLog(`🔄 Firebase data changed: ${JSON.stringify(data)}`);
        
        if (data) {
          addLog(`✅ Incoming call detected with status: ${data.status}`);
          
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification('Test Call', {
              body: `Incoming ${data.callType} call from ${data.callerName || data.callerId}`,
              tag: 'test-call'
            });
            addLog('✅ Browser notification shown');
          }
        } else {
          addLog('📭 No call data found');
        }
      }, (error) => {
        addLog(`❌ Firebase listener error: ${error.message}`);
      });
      
      addLog('✅ Call listener set up successfully');
      addLog('ℹ️  Now try sending a call to this user from another account');
      
      // Clean up after 30 seconds
      setTimeout(() => {
        unsubscribe();
        addLog('ℹ️  Call listener automatically unsubscribed after 30 seconds');
      }, 30000);
      
      setTestStep(5);
    } catch (error: any) {
      addLog(`❌ Call listener test failed: ${error.message}`);
    }
  };

  // Test Step 6: Manual popup trigger
  const testManualPopup = async () => {
    addLog('=== Testing Manual Popup Trigger ===');
    addLog('ℹ️  This test requires checking if the GlobalCallManager is working');
    addLog('ℹ️  Please check if you see a popup on screen');
    
    // Try to trigger the global call manager
    if (globalManagerActive) {
      addLog('✅ GlobalCallManager is active, trying to trigger popup');
      
      // Send a test signal to ourselves
      if (user) {
        const signal = {
          callerId: user.uid,
          callerName: 'Test Trigger',
          callType: 'audio',
          timestamp: Date.now(),
          status: 'ringing'
        };
        
        try {
          const callRef = ref(database, `calls/${user.uid}/incoming`);
          await set(callRef, signal);
          addLog('✅ Test signal sent to trigger popup');
          addLog('ℹ️  Check if popup appears. If not, GlobalCallManager may have issues');
        } catch (error: any) {
          addLog(`❌ Error sending test signal: ${error.message}`);
        }
      }
    } else {
      addLog('❌ GlobalCallManager is not active');
      addLog('ℹ️  The popup will not appear without GlobalCallManager');
    }
    
    setTestStep(6);
  };

  // Run all tests
  const runAllTests = async () => {
    setLogs([]);
    setTestStep(0);
    
    await testFirebaseInit();
    await testUserAuth();
    await testDatabaseConnectivity();
    await testSendCallSignal();
    await testListenForCalls();
    await testManualPopup();
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  }

  if (!user) {
    return <div className="p-4">Please log in to debug the call system</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Call System Debugger</h1>
      <p className="text-muted-foreground">
        This tool helps diagnose issues with the call popup system. Run tests step by step or all at once.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className={`w-3 h-3 rounded-full ${globalManagerActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>GlobalCallManager: {globalManagerActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className={`w-3 h-3 rounded-full ${notificationPermission === 'granted' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>Notifications: {notificationPermission}</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>User: {user ? 'Authenticated' : 'Not authenticated'}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={requestNotificationPermission} variant="outline">
              Request Notification Permission
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Receiver User ID</label>
              <Input
                placeholder="User ID to send test call to"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-sm font-medium">Call Type</label>
              <select
                value={callType}
                onChange={(e) => setCallType(e.target.value as 'audio' | 'video')}
                className="w-full border rounded px-2 py-2"
              >
                <option value="audio">Audio Call</option>
                <option value="video">Video Call</option>
              </select>
            </div>
            <div className="pb-1">
              <Button onClick={() => setReceiverId(user?.uid || '')} variant="outline">
                Use My ID
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Your User ID: {user?.uid}</p>
            <p>Use another logged-in user's ID as receiver to test the full flow.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              onClick={testFirebaseInit}
              variant={testStep >= 1 ? "default" : "outline"}
              disabled={testStep > 0}
            >
              1. Firebase Init
            </Button>
            <Button 
              onClick={testUserAuth}
              variant={testStep >= 2 ? "default" : "outline"}
              disabled={testStep < 1 || testStep > 1}
            >
              2. User Auth
            </Button>
            <Button 
              onClick={testDatabaseConnectivity}
              variant={testStep >= 3 ? "default" : "outline"}
              disabled={testStep < 2 || testStep > 2}
            >
              3. DB Connectivity
            </Button>
            <Button 
              onClick={testSendCallSignal}
              variant={testStep >= 4 ? "default" : "outline"}
              disabled={testStep < 3 || testStep > 3}
            >
              4. Send Call Signal
            </Button>
            <Button 
              onClick={testListenForCalls}
              variant={testStep >= 5 ? "default" : "outline"}
              disabled={testStep < 4 || testStep > 4}
            >
              5. Listen for Calls
            </Button>
            <Button 
              onClick={testManualPopup}
              variant={testStep >= 6 ? "default" : "outline"}
              disabled={testStep < 5 || testStep > 5}
            >
              6. Manual Popup
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runAllTests} variant="secondary">
              Run All Tests
            </Button>
            <Button onClick={() => setLogs([])} variant="outline">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">Run tests to see logs...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log.startsWith('[DEBUG] ❌') && <span className="text-red-500">{log}</span>}
                  {log.startsWith('[DEBUG] ✅') && <span className="text-green-500">{log}</span>}
                  {log.startsWith('[DEBUG] ⚠️') && <span className="text-yellow-500">{log}</span>}
                  {!log.startsWith('[DEBUG] ❌') && !log.startsWith('[DEBUG] ✅') && !log.startsWith('[DEBUG] ⚠️') && log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}