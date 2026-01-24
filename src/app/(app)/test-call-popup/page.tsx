"use client";

import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, database } from '@/lib/firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import IncomingCall from '@/components/call/incoming-call';

export default function TestCallPopup() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState({ name: '', avatar: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [globalManagerActive, setGlobalManagerActive] = useState(false);

  // Add a log message
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  // Check if GlobalCallManager is active
  useEffect(() => {
    const checkGlobalManager = () => {
      const isActive = !!(window as any).globalCallManagerActive;
      setGlobalManagerActive(isActive);
      addLog(`GlobalCallManager active: ${isActive}`);
    };

    checkGlobalManager();
    const interval = setInterval(checkGlobalManager, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    addLog(`Setting up call listener for user: ${user.uid}`);
    
    const incomingCallRef = ref(database, `calls/${user.uid}/incoming`);
    
    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      const data = snapshot.val();
      addLog(`Firebase data changed: ${JSON.stringify(data)}`);
      
      if (data && data.status === 'ringing') {
        setCallerInfo({
          name: data.callerName || data.callerId || 'Unknown Caller',
          avatar: data.callerAvatar || ''
        });
        setShowIncomingCall(true);
        addLog(`Incoming call detected from: ${data.callerId}`);
        
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification('Test Call', {
            body: `Incoming ${data.callType} call from ${data.callerName || data.callerId}`,
            tag: 'test-call'
          });
        }
      } else {
        setShowIncomingCall(false);
      }
    }, (error) => {
      addLog(`Firebase listener error: ${error.message}`);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
  const handleAccept = async () => {
    if (!user) return;

    try {
      addLog(`Accepting call`);
      
      // Update call status
      await set(ref(database, `calls/${user.uid}/incoming/status`), 'accepted');
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('Call data cleaned up');
      }, 2000);
      
      setShowIncomingCall(false);
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
  const handleDecline = async () => {
    if (!user) return;

    try {
      addLog(`Declining call`);
      
      // Update call status
      await set(ref(database, `calls/${user.uid}/incoming/status`), 'declined');
      
      // Clean up after a delay
      setTimeout(async () => {
        await remove(ref(database, `calls/${user.uid}/incoming`));
        addLog('Call data cleaned up');
      }, 2000);
      
      setShowIncomingCall(false);
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

  // Manual trigger for popup
  const triggerPopup = () => {
    setCallerInfo({
      name: user?.displayName || user?.email?.split('@')[0] || 'Test User',
      avatar: user?.photoURL || ''
    });
    setShowIncomingCall(true);
    addLog('Manual popup trigger activated');
  };

  if (!user) {
    return <div className="p-4">Please log in to test call components</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Test Call Popup</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${globalManagerActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>GlobalCallManager: {globalManagerActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div>User ID: {user.uid}</div>
          <div>User Email: {user.email}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send Test Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Receiver User ID"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              className="flex-1 min-w-[200px]"
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
          <div className="text-sm text-muted-foreground">
            <p>Enter the User ID of another logged-in user to test call functionality.</p>
            <p>Your User ID: {user.uid}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={triggerPopup} variant="secondary">
            Manually Trigger Popup
          </Button>
          <p className="text-sm text-muted-foreground">
            Use this button to test if the popup component works independently of the call system.
          </p>
        </CardContent>
      </Card>

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

      {/* Incoming Call Popup */}
      <IncomingCall
        visible={showIncomingCall}
        callerName={callerInfo.name}
        callerAvatar={callerInfo.avatar}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}