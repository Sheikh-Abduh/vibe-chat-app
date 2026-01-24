"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, get, onValue, remove } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { useCallSignaling } from '@/hooks/useCallSignaling';

export default function DebugCallFlow() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [rtdbData, setRtdbData] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setLogs(prev => [...prev.slice(-19), logMessage]); // Keep last 20 logs
    console.log(logMessage);
  };

  const { sendCallSignal } = useCallSignaling({
    currentUserId: user?.uid || null,
    onIncomingCall: (signal, callId) => {
      addLog(`🎯 INCOMING CALL RECEIVED: ${signal.callerName || signal.callerId}`);
      toast({
        title: "Incoming Call Detected!",
        description: `Call from ${signal.callerName || signal.callerId}`,
      });
    },
    onCallStatusChange: (status) => {
      addLog(`📞 Call status changed: ${status}`);
    },
  });

  // Listen for RTDB changes
  useEffect(() => {
    if (!user) return;

    const incomingRef = ref(database, `calls/${user.uid}/incoming`);
    const unsubscribe = onValue(incomingRef, (snapshot) => {
      const data = snapshot.val();
      setRtdbData(data);
      if (data) {
        addLog(`📊 RTDB Data received: ${JSON.stringify(data)}`);
      } else {
        addLog(`📭 RTDB Data cleared`);
      }
    }, (error) => {
      addLog(`❌ RTDB Listener error: ${error.message}`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSendCall = async () => {
    if (!receiverId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a receiver ID",
      });
      return;
    }

    try {
      addLog(`📤 Sending call to: ${receiverId}`);
      const callId = await sendCallSignal(
        receiverId.trim(),
        'audio',
        user?.displayName || 'Debug Caller',
        user?.photoURL || undefined
      );
      
      addLog(`✅ Call sent successfully: ${callId}`);
      toast({
        title: "Call Sent",
        description: `Call sent to ${receiverId}`,
      });
    } catch (error: any) {
      addLog(`❌ Call send failed: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message,
      });
    }
  };

  const checkRTDBData = async () => {
    if (!user) return;

    try {
      addLog(`🔍 Checking RTDB data for user: ${user.uid}`);
      
      const incomingRef = ref(database, `calls/${user.uid}/incoming`);
      const incomingSnapshot = await get(incomingRef);
      addLog(`📥 Incoming data: ${JSON.stringify(incomingSnapshot.val())}`);
      
      const outgoingRef = ref(database, `calls/${user.uid}/outgoing`);
      const outgoingSnapshot = await get(outgoingRef);
      addLog(`📤 Outgoing data: ${JSON.stringify(outgoingSnapshot.val())}`);
      
    } catch (error: any) {
      addLog(`❌ RTDB check failed: ${error.message}`);
    }
  };

  const clearRTDBData = async () => {
    if (!user) return;

    try {
      addLog(`🧹 Clearing RTDB data for user: ${user.uid}`);
      
      const incomingRef = ref(database, `calls/${user.uid}/incoming`);
      await remove(incomingRef);
      
      const outgoingRef = ref(database, `calls/${user.uid}/outgoing`);
      await remove(outgoingRef);
      
      addLog(`✅ RTDB data cleared`);
      toast({
        title: "Data Cleared",
        description: "RTDB call data has been cleared",
      });
    } catch (error: any) {
      addLog(`❌ Clear failed: ${error.message}`);
    }
  };

  const testDirectRTDBWrite = async () => {
    if (!user || !receiverId.trim()) return;

    try {
      addLog(`🧪 Testing direct RTDB write to: ${receiverId}`);
      
      const testSignal = {
        callerId: user.uid,
        callerName: user.displayName || 'Test Caller',
        callerAvatar: user.photoURL,
        callType: 'audio',
        timestamp: Date.now(),
        status: 'ringing',
        callId: `test_${Date.now()}`
      };

      const receiverPath = `calls/${receiverId.trim()}/incoming`;
      addLog(`📝 Writing to path: ${receiverPath}`);
      
      await set(ref(database, receiverPath), testSignal);
      addLog(`✅ Direct RTDB write successful`);
      
      toast({
        title: "Direct Write Test",
        description: "Test signal written to RTDB",
      });
    } catch (error: any) {
      addLog(`❌ Direct write failed: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Write Failed",
        description: error.message,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Call Flow Debug Tool</CardTitle>
          <CardDescription>
            Comprehensive debugging for the call signaling system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Current User Info</h3>
            <div className="text-sm space-y-1">
              <p>User ID: {user?.uid || 'Not logged in'}</p>
              <p>Email: {user?.email || 'N/A'}</p>
              <p>Email Verified: {user?.emailVerified ? 'Yes' : 'No'}</p>
              <p>Display Name: {user?.displayName || 'N/A'}</p>
            </div>
          </div>

          {/* Call Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="receiverId" className="text-sm font-medium">
                Receiver User ID
              </label>
              <Input
                id="receiverId"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Enter the user ID to call"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSendCall} disabled={!user || !receiverId.trim()}>
                Send Call Signal
              </Button>
              <Button onClick={checkRTDBData} disabled={!user} variant="outline">
                Check RTDB Data
              </Button>
              <Button onClick={clearRTDBData} disabled={!user} variant="outline">
                Clear RTDB Data
              </Button>
              <Button onClick={testDirectRTDBWrite} disabled={!user || !receiverId.trim()} variant="secondary">
                Test Direct RTDB Write
              </Button>
            </div>
          </div>

          {/* RTDB Data Display */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold mb-2">Current RTDB Data</h3>
            <pre className="text-xs overflow-auto max-h-32">
              {rtdbData ? JSON.stringify(rtdbData, null, 2) : 'No data'}
            </pre>
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
            <h3 className="font-semibold mb-2">Debug Instructions</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Make sure both users are logged in and email verified</li>
              <li>Enter the receiver's user ID in the input field</li>
              <li>Click "Send Call Signal" to initiate a call</li>
              <li>Check the logs for any errors or issues</li>
              <li>Use "Check RTDB Data" to verify data is written</li>
              <li>Use "Test Direct RTDB Write" to bypass the hook</li>
              <li>Monitor the receiver's console for incoming call logs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
