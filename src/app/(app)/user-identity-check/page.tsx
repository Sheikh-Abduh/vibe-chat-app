"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '@/lib/firebase';
import { ref, get, set, onValue } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

export default function UserIdentityCheck() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [rtdbData, setRtdbData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setLogs(prev => [...prev.slice(-19), logMessage]);
    console.log(logMessage);
  };

  useEffect(() => {
    if (!user) return;

    addLog(`👤 User authenticated: ${user.uid}`);
    addLog(`👤 Display name: ${user.displayName || 'N/A'}`);
    addLog(`👤 Email: ${user.email || 'N/A'}`);
    addLog(`👤 Email verified: ${user.emailVerified ? 'Yes' : 'No'}`);

    // Listen for RTDB changes
    const incomingRef = ref(database, `calls/${user.uid}/incoming`);
    const unsubscribe = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      setRtdbData(data);
      if (data) {
        addLog(`📊 RTDB Incoming data: ${JSON.stringify(data)}`);
      } else {
        addLog(`📭 RTDB Incoming data cleared`);
      }
    }, (error) => {
      addLog(`❌ RTDB Listener error: ${error.message}`);
    });

    return () => unsubscribe();
  }, [user]);

  const checkRTDBData = async () => {
    if (!user) return;

    try {
      addLog(`🔍 Checking RTDB data for user: ${user.uid}`);
      
      const incomingRef = ref(database, `calls/${user.uid}/incoming`);
      const incomingSnapshot = await get(incomingRef);
      const incomingData = incomingSnapshot.val();
      addLog(`📥 Incoming data: ${JSON.stringify(incomingData)}`);
      
      const outgoingRef = ref(database, `calls/${user.uid}/outgoing`);
      const outgoingSnapshot = await get(outgoingRef);
      const outgoingData = outgoingSnapshot.val();
      addLog(`📤 Outgoing data: ${JSON.stringify(outgoingData)}`);
      
      // Check if there are any calls for other users
      addLog(`🔍 Checking for calls to other users...`);
      const allCallsRef = ref(database, 'calls');
      const allCallsSnapshot = await get(allCallsRef);
      const allCallsData = allCallsSnapshot.val();
      addLog(`📋 All calls data: ${JSON.stringify(allCallsData)}`);
      
    } catch (error: any) {
      addLog(`❌ RTDB check failed: ${error.message}`);
    }
  };

  const testWriteToSelf = async () => {
    if (!user) return;

    try {
      addLog(`🧪 Testing write to own incoming path: calls/${user.uid}/incoming`);
      
      const testSignal = {
        callerId: 'test-caller',
        callerName: 'Test Caller',
        callType: 'audio',
        timestamp: Date.now(),
        status: 'ringing',
        callId: `test_${Date.now()}`
      };

      await set(ref(database, `calls/${user.uid}/incoming`), testSignal);
      addLog(`✅ Test write successful`);
      
      toast({
        title: "Test Write Successful",
        description: "Test signal written to your incoming path",
      });
    } catch (error: any) {
      addLog(`❌ Test write failed: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Write Failed",
        description: error.message,
      });
    }
  };

  const clearAllData = async () => {
    if (!user) return;

    try {
      addLog(`🧹 Clearing all call data for user: ${user.uid}`);
      
      const incomingRef = ref(database, `calls/${user.uid}/incoming`);
      await set(incomingRef, null);
      
      const outgoingRef = ref(database, `calls/${user.uid}/outgoing`);
      await set(outgoingRef, null);
      
      addLog(`✅ All data cleared`);
      toast({
        title: "Data Cleared",
        description: "All call data has been cleared",
      });
    } catch (error: any) {
      addLog(`❌ Clear failed: ${error.message}`);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>User Identity Check</CardTitle>
            <CardDescription>Please log in to check user identity</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>User Identity Check</CardTitle>
          <CardDescription>
            Verify user authentication and RTDB access for call signaling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Current User Info</h3>
            <div className="text-sm space-y-1">
              <p><strong>User ID:</strong> {user.uid}</p>
              <p><strong>Display Name:</strong> {user.displayName || 'N/A'}</p>
              <p><strong>Email:</strong> {user.email || 'N/A'}</p>
              <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
              <p><strong>Auth Current User:</strong> {auth.currentUser?.uid}</p>
              <p><strong>Are they the same?</strong> {user.uid === auth.currentUser?.uid ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* RTDB Data Display */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold mb-2">Current RTDB Incoming Data</h3>
            <pre className="text-xs overflow-auto max-h-32">
              {rtdbData ? JSON.stringify(rtdbData, null, 2) : 'No data'}
            </pre>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={checkRTDBData}>
              Check All RTDB Data
            </Button>
            <Button onClick={testWriteToSelf} variant="outline">
              Test Write to Self
            </Button>
            <Button onClick={clearAllData} variant="destructive">
              Clear All Data
            </Button>
          </div>

          {/* Logs */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Logs</h3>
            <div className="text-xs space-y-1 max-h-64 overflow-auto font-mono">
              {logs.map((log, index) => (
                <div key={index} className="text-gray-600 dark:text-gray-400">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Check if the User ID matches what you expect</li>
              <li>Verify email is verified (required for RTDB access)</li>
              <li>Click "Check All RTDB Data" to see all call data</li>
              <li>Click "Test Write to Self" to verify RTDB write permissions</li>
              <li>Look for any calls in the "All calls data" section</li>
              <li>If you see calls for other users, that's normal</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
