"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useCallSignaling } from '@/hooks/useCallSignaling';
import { useToast } from '@/hooks/use-toast';

export default function TestCallDebug() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [receiverId, setReceiverId] = useState('');
  const [isListening, setIsListening] = useState(false);

  const { sendCallSignal } = useCallSignaling({
    currentUserId: user?.uid || null,
    onIncomingCall: (signal, callId) => {
      console.log('🎯 TEST: Received incoming call:', signal, callId);
      toast({
        title: "Incoming Call Detected!",
        description: `Call from ${signal.callerName || signal.callerId}`,
      });
    },
    onCallStatusChange: (status) => {
      console.log('🎯 TEST: Call status changed:', status);
      toast({
        title: "Call Status Update",
        description: `Status: ${status}`,
      });
    },
  });

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
      const callId = await sendCallSignal(
        receiverId.trim(),
        'audio',
        user?.displayName || 'Test Caller',
        user?.photoURL || undefined
      );
      
      toast({
        title: "Call Sent",
        description: `Call sent to ${receiverId} with ID: ${callId}`,
      });
    } catch (error) {
      console.error('Error sending call:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: "Failed to send call",
      });
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    toast({
      title: isListening ? "Stopped Listening" : "Started Listening",
      description: isListening ? "No longer listening for calls" : "Now listening for incoming calls",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Call Debug Test</CardTitle>
          <CardDescription>
            Test the call signaling system to debug incoming call popup issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Current User: {user?.uid || 'Not logged in'}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Email Verified: {user?.emailVerified ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Listening Status: {isListening ? 'Active' : 'Inactive'}
            </p>
          </div>

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

          <div className="flex gap-2">
            <Button onClick={handleSendCall} disabled={!user || !receiverId.trim()}>
              Send Test Call
            </Button>
            <Button 
              onClick={toggleListening} 
              variant={isListening ? "destructive" : "default"}
              disabled={!user}
            >
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Make sure you're logged in and email is verified</li>
              <li>Enter another user's ID in the receiver field</li>
              <li>Click "Send Test Call" to trigger a call</li>
              <li>Check the console logs for debugging information</li>
              <li>Look for the incoming call popup on the receiver's side</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <div className="text-sm space-y-1">
              <p>Database Path: calls/{user?.uid}/incoming</p>
              <p>RTDB Rules: Check database.rules.json</p>
              <p>Global Manager: Check if GlobalCallManager is mounted</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
