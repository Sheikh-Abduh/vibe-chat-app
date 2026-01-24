"use client";

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import IncomingCall from '@/components/call/incoming-call';

export default function TestManualPopup() {
  const [user] = useAuthState(auth);
  const [showPopup, setShowPopup] = useState(false);
  const [testStep, setTestStep] = useState(0);

  const triggerPopup = () => {
    setShowPopup(true);
    console.log('Popup manually triggered');
  };

  const handleAccept = () => {
    setShowPopup(false);
    console.log('Call accepted');
  };

  const handleDecline = () => {
    setShowPopup(false);
    console.log('Call declined');
  };

  if (!user) {
    return <div className="p-4">Please log in to test the popup</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Manual Popup Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Popup Component</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This page tests if the IncomingCall popup component works correctly when manually triggered.</p>
          
          <div className="flex gap-2">
            <Button onClick={triggerPopup}>
              Trigger Popup
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPopup(false)}
              disabled={!showPopup}
            >
              Hide Popup
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>Click "Trigger Popup" to show the incoming call popup.</p>
            <p>If the popup appears, the component is working correctly.</p>
            <p>If it doesn't appear, there may be an issue with the component or its styling.</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${showPopup ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Popup visibility: {showPopup ? 'Visible' : 'Hidden'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>User authenticated: {user ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Call Popup */}
      <IncomingCall
        visible={showPopup}
        callerName={user?.displayName || user?.email?.split('@')[0] || 'Test User'}
        callerAvatar={user?.photoURL || ''}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}