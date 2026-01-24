"use client";

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function EndToEndCallTest() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<Function | null>(null);

  // Add a log message
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[E2E TEST] ${message}`);
  };

  // Start listening for incoming calls
  const startListening = () => {
    if (!user) {
      addLog('❌ No authenticated user');
      return;
    }

    if (isListening) {
      addLog('ℹ️ Already listening for calls');
      return;
    }

    addLog(`👂 Starting to listen for calls on path: calls/${user.uid}/incoming`);
    
    const incomingCallRef = ref(database, `calls/${user.uid}/incoming`);
    
    const unsubscribeFn = onValue(incomingCallRef, (snapshot) => {
      const data = snapshot.val();
      addLog(`🔄 Data received: ${JSON.stringify(data)}`);
      
      if (data) {
        if (data.status === 'ringing') {
          addLog(`✅ Incoming ${data.callType} call from ${data.callerName || data.callerId}`);
          
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification('Test Call', {
              body: `Incoming ${data.callType} call from ${data.callerName || data.callerId}`,
              tag: 'e2e-test-call'
            });
          }
        } else {
          addLog(`📞 Call status update: ${data.status}`);
        }
      } else {
        addLog('📭 No call data');
      }
    }, (error) => {
      addLog(`❌ Listener error: ${error.message}`);
    });

    setUnsubscribe(() => unsubscribeFn);
    setIsListening(true);
    addLog('✅ Call listener started');
  };

  // Stop listening for calls
  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
      setIsListening(false);
      addLog('🛑 Call listener stopped');
    }
  };

  // Send test call
  const sendTestCall = async () => {
    if (!user || !receiverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a receiver ID and log in"
      });
      return;
    }

    try {
      addLog(`📤 Sending ${callType} call to: ${receiverId}`);
      
      const signal = {
        callerId: user.uid,
        callerName: user.displayName || user.email?.split('@')[0] || 'Test User',
        callerAvatar: user.photoURL || undefined,
        callType,
        timestamp: Date.now(),
        status: 'ringing'
      };

      // Send call signal to receiver
      await set(ref(database, `calls/${receiverId}/incoming`), signal);
      addLog(`✅ Call signal sent successfully to: ${receiverId}`);
      
      toast({
        title: "Test Call Sent",
        description: `Sent ${callType} call to ${receiverId}`
      });
    } catch (error: any) {
      addLog(`❌ Error sending call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Accept call
  const acceptCall = async () => {
    if (!user) return;

    try {
      addLog('✅ Accepting call');
      
      // Update call status
      await set(ref(database, `calls/${user.uid}/incoming/status`), 'accepted');
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('🧹 Call data cleaned up');
      }, 2000);
      
      addLog('✅ Call accepted');
      
      toast({
        title: "Call Accepted",
        description: "Test call accepted"
      });
    } catch (error: any) {
      addLog(`❌ Error accepting call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Decline call
  const declineCall = async () => {
    if (!user) return;

    try {
      addLog('❌ Declining call');
      
      // Update call status
      await set(ref(database, `calls/${user.uid}/incoming/status`), 'declined');
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('🧹 Call data cleaned up');
      }, 2000);
      
      addLog('✅ Call declined');
      
      toast({
        title: "Call Declined",
        description: "Test call declined"
      });
    } catch (error: any) {
      addLog(`❌ Error declining call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  if (!user) {
    return <div className="p-4">Please log in to test the call system</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">End-to-End Call Test</h1>
      <p className="text-muted-foreground">
        This test simulates a complete call flow between two users.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Your User ID</label>
              <div className="p-2 bg-muted rounded text-sm font-mono">
                {user.uid}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Receiver User ID</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter receiver's User ID"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                />
                <Button 
                  onClick={() => setReceiverId(user.uid)} 
                  variant="outline"
                  size="sm"
                >
                  Use My ID
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Call Type</label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as 'audio' | 'video')}
              className="w-full md:w-auto border rounded px-2 py-2"
            >
              <option value="audio">Audio Call</option>
              <option value="video">Video Call</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-medium">As Caller (Sending Calls)</h3>
              <Button onClick={sendTestCall} className="w-full">
                Send Test Call
              </Button>
              <p className="text-sm text-muted-foreground">
                This sends a call signal to the receiver ID specified above.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">As Receiver (Receiving Calls)</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={startListening}
                  variant={isListening ? "secondary" : "default"}
                  className="flex-1"
                >
                  {isListening ? "Listening..." : "Start Listening"}
                </Button>
                <Button 
                  onClick={stopListening}
                  variant="outline"
                  disabled={!isListening}
                >
                  Stop
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={acceptCall} variant="default" className="flex-1">
                  Accept Call
                </Button>
                <Button onClick={declineCall} variant="destructive" className="flex-1">
                  Decline Call
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Start listening to receive calls sent to your User ID.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">Run tests to see logs...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log.startsWith('[E2E TEST] ❌') && <span className="text-red-500">{log}</span>}
                  {log.startsWith('[E2E TEST] ✅') && <span className="text-green-500">{log}</span>}
                  {log.startsWith('[E2E TEST] 🎯') && <span className="text-blue-500">{log}</span>}
                  {log.startsWith('[E2E TEST] 👂') && <span className="text-purple-500">{log}</span>}
                  {log.startsWith('[E2E TEST] 📞') && <span className="text-yellow-500">{log}</span>}
                  {log.startsWith('[E2E TEST] 📤') && <span className="text-indigo-500">{log}</span>}
                  {log.startsWith('[E2E TEST] 🧹') && <span className="text-gray-500">{log}</span>}
                  {!log.startsWith('[E2E TEST] ❌') && 
                   !log.startsWith('[E2E TEST] ✅') && 
                   !log.startsWith('[E2E TEST] 🎯') && 
                   !log.startsWith('[E2E TEST] 👂') && 
                   !log.startsWith('[E2E TEST] 📞') && 
                   !log.startsWith('[E2E TEST] 📤') && 
                   !log.startsWith('[E2E TEST] 🧹') && log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}