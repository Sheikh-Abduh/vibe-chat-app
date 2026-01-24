"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserInteractionStatus } from '@/lib/user-blocking';
import { auth } from '@/lib/firebase';
import { useLiveKitCall } from '@/hooks/useLiveKitCall';

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

  // Initialize the call hook for this conversation
  const webrtc = useLiveKitCall({
    currentUserId: auth.currentUser?.uid || null,
    otherUserId,
    channelId: conversationId,
    currentUserName: auth.currentUser?.displayName || undefined,
    currentUserAvatar: auth.currentUser?.photoURL || undefined,
  });

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
    console.log('📞 [CallControls] handleStartCall called:', { isVideoCall, disabled, isStartingCall, webrtcIsCalling: webrtc.isCalling });
    
    if (disabled || isStartingCall || webrtc.isCalling) {
      console.log('📞 [CallControls] Call blocked:', { disabled, isStartingCall, webrtcIsCalling: webrtc.isCalling });
      return;
    }

    if (!canInteract) {
      console.log('📞 [CallControls] Cannot interact with user');
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
    if (!currentUser) {
      console.log('📞 [CallControls] No current user');
      return;
    }

    console.log('📞 [CallControls] Starting call process...');
    setIsStartingCall(true);

    try {
      if (isVideoCall) {
        console.log('📞 [CallControls] Starting video call...');
        await webrtc.startVideoCall();
      } else {
        console.log('📞 [CallControls] Starting voice call...');
        await webrtc.startVoiceCall();
      }
      
      console.log('📞 [CallControls] Call started successfully');
      toast({
        title: "Calling...",
        description: `Calling ${otherUserName}...`,
      });
    } catch (error: any) {
      console.error('📞 [CallControls] Call failed:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Failed to start call"
      });
    } finally {
      setIsStartingCall(false);
    }
  };

  const callsDisabled = disabled || !canInteract || webrtc.isCalling;

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
          {isStartingCall || webrtc.isCalling ? 'Calling...' : 'Voice Call'}
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
          {isStartingCall || webrtc.isCalling ? 'Calling...' : 'Video Call'}
        </span>
      </Button>
    </div>
  );
};

export default CallControls;