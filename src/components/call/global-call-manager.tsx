"use client";

import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useCallSignaling, type CallSignal, markCallAsHandled } from '@/hooks/useCallSignaling';
import IncomingCall from './incoming-call';
import GlobalRingtoneManager from './global-ringtone-manager';
import { useToast } from '@/hooks/use-toast';
import { useCallStore } from '@/stores/call-store';

/**
 * Global Call Manager - Handles incoming calls across the entire app
 * This component should be placed in the app layout to ensure users
 * receive call popups regardless of which page they're on.
 */
export default function GlobalCallManager() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const callStore = useCallStore();

  // Debug logging
  useEffect(() => {
    console.log('🌍 GlobalCallManager: Component mounted');
    console.log('🌍 GlobalCallManager: User state:', user?.uid || 'No user');

    // Add a global flag so we can check if this component is running
    (window as any).globalCallManagerActive = true;

    // Also add a more descriptive flag
    (window as any).__VIBE_CALL_MANAGER_ACTIVE = true;
  }, []);

  useEffect(() => {
    console.log('🌍 GlobalCallManager: User changed:', user?.uid || 'No user');
  }, [user]);

  // Debug logging for incoming call state changes
  useEffect(() => {
    console.log('🌍 GlobalCallManager: Incoming call state changed:',
      callStore.incomingCall ? 'CALL RECEIVED' : 'No call');
    if (callStore.incomingCall) {
      console.log('🌍 GlobalCallManager: Call details:', callStore.incomingCall);
    }
  }, [callStore.incomingCall]);

  // Initialize the call signaling hook to listen for incoming calls
  const { acceptCall, declineCall } = useCallSignaling({
    currentUserId: user?.uid || null,
    onIncomingCall: async (signal: CallSignal, callId: string) => {
      console.log('🌍 Global: Received incoming call:', signal);
      console.log('🌍 Global: Call ID:', callId);

      // Only process if we don't already have an incoming call
      if (!callStore.incomingCall) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          const callerDoc = await getDoc(doc(db, 'users', signal.callerId));

          // Set caller info from Firestore data
          if (callerDoc.exists()) {
            const callerData = callerDoc.data();
            const callerName = callerData.profileDetails?.displayName || callerData.email?.split('@')[0] || 'Unknown User';
            const callerAvatar = callerData.profileDetails?.avatarUrl || null;

            // Update the store with caller info
            callStore.setCallerInfo({
              uid: signal.callerId,
              name: callerName,
              avatar: callerAvatar
            });

            // Update the signal with caller info
            signal.callerName = callerName;
            signal.callerAvatar = callerAvatar;
          }

          // Set the incoming call in the store
          callStore.setIncomingCall({ signal, callId });
          callStore.setCallType(signal.callType);
          callStore.setCurrentCallId(callId);
        } catch (error) {
          console.error('Error fetching caller info:', error);
          toast({
            title: "Error",
            description: "Could not fetch caller information",
            variant: "destructive"
          });
        }
      } else {
        console.log('🌍 Global: Ignoring incoming call - already have one');
      }
    },
    onCallStatusChange: (status: string) => {
      console.log('🌍 Global: Call status changed:', status);
      if (status === 'declined' || status === 'cancelled' || status === 'accepted' || status === 'cleared') {
        // Reset all call state
        callStore.resetState();
      }
    },
  });

  // Debug logging for call signaling initialization
  useEffect(() => {
    console.log('🌍 GlobalCallManager: Call signaling initialized for user:', user?.uid || 'No user');
    console.log('🌍 GlobalCallManager: User object:', user);
    console.log('🌍 GlobalCallManager: User email verified:', user?.emailVerified);
    console.log('🌍 GlobalCallManager: User display name:', user?.displayName);
    console.log('🌍 GlobalCallManager: User email:', user?.email);

    if (typeof window !== 'undefined') {
      (window as any).__VIBE_CURRENT_USER_ID = user?.uid ?? null;
    }

    // Add debug helpers
    if (user && typeof window !== 'undefined') {
      // Test call with call store
      (window as any).testIncomingCall = () => {
        console.log('🧪 TEST: Manually triggering incoming call');
        callStore.setIncomingCall({
          signal: {
            callerId: 'test-caller-id',
            callerName: 'Test Caller',
            callerAvatar: undefined,
            callType: 'audio',
            timestamp: Date.now(),
            status: 'ringing'
          },
          callId: 'test-call-id'
        });
        callStore.setCallerInfo({
          uid: 'test-caller-id',
          name: 'Test Caller',
          avatar: null
        });
      };

      // Check call state
      (window as any).checkCallState = () => {
        console.log('📞 Call State:', {
          incomingCall: callStore.incomingCall,
          isInCall: callStore.isInCall,
          callType: callStore.callType,
          callerInfo: callStore.callerInfo
        });
      };

      // Check RTDB data
      (window as any).checkRTDBData = async () => {
        const { ref, get } = await import('firebase/database');
        const { database } = await import('@/lib/firebase');

        try {
          const incomingRef = ref(database, `calls/${user.uid}/incoming`);
          const snapshot = await get(incomingRef);
          console.log('🔍 RTDB Check - Incoming calls data:', snapshot.val());

          const outgoingRef = ref(database, `calls/${user.uid}/outgoing`);
          const outgoingSnapshot = await get(outgoingRef);
          console.log('🔍 RTDB Check - Outgoing calls data:', outgoingSnapshot.val());
        } catch (error) {
          console.error('🔍 RTDB Check - Error:', error);
        }
      };
    }
  }, [user?.uid]);

  // Handle incoming call acceptance
  const handleAcceptIncomingCall = async () => {
    const incomingCall = callStore.incomingCall;
    if (!incomingCall || !user) return;

    try {
      console.log('📞 Accepting incoming call:', incomingCall.callId);

      // Set in-call state immediately to hide the popup
      callStore.setIsInCall(true);
      callStore.setCallType('audio');

      // Store caller ID before resetting incoming call state
      const callerId = incomingCall.signal.callerId;
      const callId = incomingCall.callId;

      // Clear the incoming call state to hide the popup
      callStore.setIncomingCall(null);

      // Then accept the call in the backend
      await acceptCall(callId, callerId);

      toast({
        title: "Call Accepted",
        description: "Connecting to call...",
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: "Failed to accept the call. Please try again.",
      });
      callStore.resetState();
    }
  };

  // Handle incoming call acceptance with video
  const handleAcceptIncomingCallWithVideo = async () => {
    const incomingCall = callStore.incomingCall;
    if (!incomingCall || !user) return;

    try {
      console.log('📹 Accepting incoming video call:', incomingCall.callId);

      // Set in-call state with video immediately to hide the popup
      callStore.setIsInCall(true);
      callStore.setCallType('video');

      // Store caller ID before resetting incoming call state
      const callerId = incomingCall.signal.callerId;
      const callId = incomingCall.callId;

      // Clear the incoming call state to hide the popup
      callStore.setIncomingCall(null);

      // Then accept the call in the backend
      await acceptCall(callId, callerId);
    } catch (error) {
      console.error('Error accepting video call:', error);
      toast({
        variant: "destructive",
        title: "Video Call Failed",
        description: "Failed to accept the video call. Please try again.",
      });
      callStore.resetState();
    }
  };

  // Handle incoming call decline
  const handleDeclineIncomingCall = async () => {
    const incomingCall = callStore.incomingCall;
    if (!incomingCall || !user) return;

    try {
      console.log('📞 Declining incoming call:', incomingCall.callId);

      // Stop any active ringtone and note the handled call before clearing state
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('stopRingtone'));
      }
      markCallAsHandled(incomingCall.callId);

      // Reset call state first to immediately hide the popup
      callStore.resetState();

      // Then decline the call in the backend
      await declineCall(incomingCall.callId, incomingCall.signal.callerId);

      toast({
        title: "Call Declined",
        description: "You declined the incoming call.",
      });
    } catch (error) {
      console.error('Error declining call:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not decline call",
      });
      // Ensure state is reset even if the API call fails
      callStore.resetState();
    }
  };

  // Don't render anything if user is not authenticated
  if (!user) {
    console.log('🌍 GlobalCallManager: No user, not rendering');
    return null;
  }

  // Debug logging for render
  console.log('🌍 GlobalCallManager: Rendering with incomingCall:', !!callStore.incomingCall);
  console.log('🌍 GlobalCallManager: incomingCall value:', callStore.incomingCall);
  console.log('🌍 GlobalCallManager: callerInfo:', callStore.callerInfo);

  return (
    <>
      {/* Incoming Call Popup - DISABLED to prevent duplicates */}
      {/* The messages page already renders IncomingCall component */}
      {/* 
      <IncomingCall
        visible={!!callStore.incomingCall}
        callerName={callStore.callerInfo?.name || 'Unknown Caller'}
        callerAvatar={callStore.callerInfo?.avatar || undefined}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
        onAcceptVideo={handleAcceptIncomingCallWithVideo}
      />
      */}

      {/* Global Ringtone Manager - Controls ringtones based on call state */}
      <GlobalRingtoneManager
        isIncomingCall={!!callStore.incomingCall}
        isOutgoingCall={false} // Global manager only handles incoming calls
      />
    </>
  );
}