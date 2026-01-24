"use client";

import { useEffect, useCallback } from "react";
import { ref, set, onValue, remove, push, serverTimestamp } from "firebase/database";
import { database } from "@/lib/firebase";

export interface CallNotificationData {
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  callType: "audio" | "video";
  timestamp: number;
  status: "ringing" | "accepted" | "declined" | "cancelled";
}

interface UseCallNotificationOptions {
  currentUserId?: string | null;
  onIncomingCall: (data: CallNotificationData, callId: string) => void;
  onCallStatusChange: (status: string) => void;
}

export function useCallNotification({ 
  currentUserId, 
  onIncomingCall, 
  onCallStatusChange 
}: UseCallNotificationOptions) {

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    const incomingCallsRef = ref(database, `userCalls/${currentUserId}/incoming`);
    
    const unsubscribe = onValue(incomingCallsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get the latest call (there should only be one active)
        const callIds = Object.keys(data);
        const latestCallId = callIds[callIds.length - 1];
        const callData = data[latestCallId];
        
        if (callData && callData.status === 'ringing') {
          console.log('Incoming call notification:', callData);
          onIncomingCall(callData, latestCallId);
        }
      }
    });

    return unsubscribe;
  }, [currentUserId, onIncomingCall]);

  // Send call notification
  const sendCallNotification = useCallback(async (
    receiverId: string,
    callType: "audio" | "video",
    callerName?: string,
    callerAvatar?: string
  ): Promise<string> => {
    if (!currentUserId) throw new Error('No current user');

    const callData: CallNotificationData = {
      callerId: currentUserId,
      callerName,
      callerAvatar,
      callType,
      timestamp: Date.now(),
      status: 'ringing'
    };

    // Create a unique call ID
    const callId = `${currentUserId}_${receiverId}_${Date.now()}`;
    
    // Set the call notification for the receiver
    await set(ref(database, `userCalls/${receiverId}/incoming/${callId}`), callData);
    
    // Also set it for the sender to track status changes
    await set(ref(database, `userCalls/${currentUserId}/outgoing/${callId}`), {
      ...callData,
      receiverId
    });

    console.log('Call notification sent:', callId);
    return callId;
  }, [currentUserId]);

  // Update call status
  const updateCallStatus = useCallback(async (
    callId: string,
    receiverId: string,
    status: "accepted" | "declined" | "cancelled"
  ) => {
    if (!currentUserId) return;

    try {
      // Update receiver's incoming call
      await set(ref(database, `userCalls/${receiverId}/incoming/${callId}/status`), status);
      
      // Update sender's outgoing call
      await set(ref(database, `userCalls/${currentUserId}/outgoing/${callId}/status`), status);
      
      // If call is no longer ringing, remove it after a short delay
      if (status !== 'ringing') {
        setTimeout(async () => {
          await remove(ref(database, `userCalls/${receiverId}/incoming/${callId}`));
          await remove(ref(database, `userCalls/${currentUserId}/outgoing/${callId}`));
        }, 2000); // 2 second delay to ensure status is processed
      }

      console.log('Call status updated:', callId, status);
      onCallStatusChange(status);
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }, [currentUserId, onCallStatusChange]);

  // Accept call
  const acceptCall = useCallback(async (callId: string, receiverId: string) => {
    await updateCallStatus(callId, receiverId, 'accepted');
  }, [updateCallStatus]);

  // Decline call
  const declineCall = useCallback(async (callId: string, receiverId: string) => {
    await updateCallStatus(callId, receiverId, 'declined');
  }, [updateCallStatus]);

  // Cancel call
  const cancelCall = useCallback(async (callId: string, receiverId: string) => {
    await updateCallStatus(callId, receiverId, 'cancelled');
  }, [updateCallStatus]);

  return {
    sendCallNotification,
    acceptCall,
    declineCall,
    cancelCall,
  };
}