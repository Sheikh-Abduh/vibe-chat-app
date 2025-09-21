"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserInteractionStatus, canUsersInteract } from '@/lib/user-blocking';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function InteractionTester() {
  const [targetUserId, setTargetUserId] = useState('');
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testInteraction = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !targetUserId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a target user ID and ensure you're logged in"
      });
      return;
    }

    try {
      const status = await getUserInteractionStatus(currentUser.uid, targetUserId);
      const canInteract = await canUsersInteract(currentUser.uid, targetUserId);
      
      const testResult = {
        currentUserId: currentUser.uid,
        targetUserId,
        ...status,
        canInteractDirect: canInteract,
        canInteractCommunity: false, // Community interactions removed - focusing on one-on-one calls only
        timestamp: new Date().toISOString()
      };
      
      setResult(testResult);
      console.log('Interaction test result:', testResult);
      
      toast({
        title: "Test Complete",
        description: `Can interact: ${canInteract}, Blocked: ${status.isBlocked}, Disconnected: ${status.isDisconnected}`
      });
    } catch (error) {
      console.error('Error testing interaction:', error);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "Error occurred during test"
      });
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Interaction Status Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Target User ID"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
        />
        <Button onClick={testInteraction} className="w-full">
          Test Interaction Status
        </Button>
        {result && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}