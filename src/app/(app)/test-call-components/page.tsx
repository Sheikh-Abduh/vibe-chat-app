"use client";

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TestCallComponents() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Add a log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    addLog(`Setting up call listener for user: ${user.uid}`);
    
    const incomingCallRef = ref(database, `calls/${user.uid}/incoming`);
    
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      const data = snapshot.val();
      addLog(`Firebase data changed: ${JSON.stringify(data)}`);
      
      if (data && data.status === 'ringing') {
        setIncomingCall(data);
        addLog(`Incoming call detected from: ${data.callerId}`);
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification('Test Call', {
            body: `Incoming ${data.callType} call from ${data.callerName || data.callerId}`,
            tag: 'test-call'
          });
        }
      } else {
        setIncomingCall(null);
      }
    }, (error) => {
      addLog(`Firebase listener error: ${error.message}`);
    });

    return () => unsubscribe();
  }, [user]);

  // Send test call
  const sendTestCall = async () => {
    if (!user || !receiverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a receiver ID"
      });
      return;
    }

    try {
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
      await set(ref(database, `calls/${receiverId}/incoming`), signal);
      addLog(`Call signal sent successfully to: ${receiverId}`);
      
      toast({
        title: "Test Call Sent",
        description: `Sent ${callType} call to ${receiverId}`
      });
    } catch (error: any) {
      addLog(`Error sending call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Accept call
  const acceptCall = async () => {
    if (!user || !incomingCall) return;

    try {
      addLog(`Accepting call from: ${incomingCall.callerId}`);
      
      // Update call status
      const updatedSignal = { ...incomingCall, status: 'accepted' };
      await set(ref(database, `calls/${user.uid}/incoming`), updatedSignal);
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('Call data cleaned up');
      }, 2000);
      
      setIncomingCall(null);
      addLog('Call accepted');
      
      toast({
        title: "Call Accepted",
        description: "Test call accepted"
      });
    } catch (error: any) {
      addLog(`Error accepting call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  // Decline call
  const declineCall = async () => {
    if (!user || !incomingCall) return;

    try {
      addLog(`Declining call from: ${incomingCall.callerId}`);
      
      // Update call status
      const updatedSignal = { ...incomingCall, status: 'declined' };
      await set(ref(database, `calls/${user.uid}/incoming`), updatedSignal);
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('Call data cleaned up');
      }, 2000);
      
      setIncomingCall(null);
      addLog('Call declined');
      
      toast({
        title: "Call Declined",
        description: "Test call declined"
      });
    } catch (error: any) {
      addLog(`Error declining call: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  };

  if (!user) {
    return <div className="p-4">Please log in to test call components</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Test Call Components</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Send Test Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Receiver User ID"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
            />
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as 'audio' | 'video')}
              className="border rounded px-2"
            >
              <option value="audio">Audio Call</option>
              <option value="video">Video Call</option>
            </select>
            <Button onClick={sendTestCall}>Send Test Call</Button>
          </div>
        </CardContent>
      </Card>

      {incomingCall && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle>Incoming Test Call</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p><strong>From:</strong> {incomingCall.callerName || incomingCall.callerId}</p>
              <p><strong>Type:</strong> {incomingCall.callType}</p>
              <p><strong>Time:</strong> {new Date(incomingCall.timestamp).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={acceptCall} variant="default">Accept</Button>
              <Button onClick={declineCall} variant="destructive">Decline</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md h-64 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}