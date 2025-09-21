"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserInteractionStatus } from '@/lib/user-blocking';
import { auth } from '@/lib/firebase';
import { sendCallInvitation } from '@/lib/call-invitations';

interface CallControlsProps {
  otherUserId: string;
  otherUserName: string;
  conversationId: string;
  disabled?: boolean;
}

export const CallControls: React.FC<CallControlsProps> = ({
  otherUserId,
  otherUserName,
  conversationId,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [canInteract, setCanInteract] = useState(true);
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    const checkInteractionStatus = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !otherUserId || otherUserId === currentUser.uid) {
        setCanInteract(true);
        setIsDisconnected(false);
        return;
      }

      try {
        const status = await getUserInteractionStatus(currentUser.uid, otherUserId);
        setCanInteract(status.canInteract);
        setIsDisconnected(status.isDisconnected);
      } catch (error) {
        console.error('Error checking interaction status:', error);
        setCanInteract(false);
        setIsDisconnected(false);
      }
    };

    checkInteractionStatus();

    const handleInteractionStatusChange = (event: CustomEvent) => {
      const { userId } = event.detail;
      if (userId === otherUserId) {
        checkInteractionStatus();
      }
    };

    window.addEventListener('interactionStatusChanged', handleInteractionStatusChange as EventListener);
    return () => {
      window.removeEventListener('interactionStatusChanged', handleInteractionStatusChange as EventListener);
    };
  }, [otherUserId]);

  const handleStartCall = async (isVideoCall: boolean) => {
    if (disabled || isStartingCall) return;

    if (!canInteract) {
      toast({
        variant: "destructive",
        title: "Cannot Call",
        description: isDisconnected
          ? `You are disconnected from ${otherUserName}. Direct calls are not available.`
          : `You cannot call ${otherUserName} at this time.`
      });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setIsStartingCall(true);

    try {
      await sendCallInvitation(
        currentUser.uid,
        currentUser.displayName || 'Unknown User',
        otherUserId,
        isVideoCall ? 'video' : 'voice',
        conversationId,
        currentUser.photoURL || null
      );
    } catch (error: any) {
      console.error('Call invitation failed:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Failed to send call invitation"
      });
    } finally {
      setIsStartingCall(false);
    }
  };

  const callsDisabled = disabled || !canInteract;

  return (
    <div className="call-controls flex items-center space-x-2" data-testid="call-controls">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStartCall(false)}
        disabled={callsDisabled || isStartingCall}
        data-testid="voice-call-button"
        className="flex items-center space-x-1"
        title={!canInteract ? (isDisconnected ? "Disconnected users cannot call each other" : "Cannot call this user") : undefined}
      >
        <Phone className="h-4 w-4" />
        <span>
          {isStartingCall ? 'Starting...' : 'Voice Call'}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStartCall(true)}
        disabled={callsDisabled || isStartingCall}
        data-testid="video-call-button"
        className="flex items-center space-x-1"
        title={!canInteract ? (isDisconnected ? "Disconnected users cannot call each other" : "Cannot call this user") : undefined}
      >
        <Video className="h-4 w-4" />
        <span>
          {isStartingCall ? 'Starting...' : 'Video Call'}
        </span>
      </Button>
    </div>
  );
};

export default CallControls;
