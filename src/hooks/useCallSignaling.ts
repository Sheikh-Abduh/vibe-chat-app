"use client";

import { useEffect, useCallback } from "react";
import { ref, set, onValue, remove, get } from "firebase/database";
import { database } from "@/lib/firebase";

const HANDLED_CALLS_STORAGE_KEY = "vibe-handled-calls";
const HANDLED_CALLS_VERSION_KEY = "vibe-handled-calls-version";
const HANDLED_CALLS_VERSION = "1";
const CALL_DATA_MIGRATION_PREFIX = "vibe-call-data-cleared";
const HANDLED_CALL_TTL = 5 * 60 * 1000;
const handledCalls = new Map<string, number>();
let handledCallsInitialized = false;
const isBrowserEnvironment = typeof window !== "undefined";
let callDataCleared = false;

const clearPreUpdateCallData = async (userId?: string) => {
  try {
    handledCalls.clear();
    handledCallsInitialized = false;

    if (isBrowserEnvironment) {
      window.localStorage.removeItem(HANDLED_CALLS_STORAGE_KEY);
      window.localStorage.setItem(HANDLED_CALLS_VERSION_KEY, HANDLED_CALLS_VERSION);
    }
  } catch (error) {
    console.error("❌ [useCallSignaling] Failed to reset handled call storage:", error);
  }

  if (!userId) {
    return;
  }

  try {
    await Promise.all([
      remove(ref(database, `calls/${userId}/incoming`)),
      remove(ref(database, `calls/${userId}/outgoing`)),
    ]);
    console.log(`🧼 [useCallSignaling] Cleared legacy call data for user: ${userId}`);
  } catch (error) {
    console.error("❌ [useCallSignaling] Failed to clear legacy Firebase call data:", error);
  }
};

const persistHandledCalls = () => {
  if (!isBrowserEnvironment) return;
  try {
    const serialized = JSON.stringify(Object.fromEntries(handledCalls));
    window.localStorage.setItem(HANDLED_CALLS_STORAGE_KEY, serialized);
    window.localStorage.setItem(HANDLED_CALLS_VERSION_KEY, HANDLED_CALLS_VERSION);
  } catch (error) {
    console.error("❌ [useCallSignaling] Failed to persist handled calls:", error);
  }
};

const pruneExpiredHandledCalls = () => {
  if (!handledCalls.size) {
    return false;
  }

  const now = Date.now();
  let mutated = false;

  handledCalls.forEach((timestamp, callId) => {
    if (now - timestamp > HANDLED_CALL_TTL) {
      handledCalls.delete(callId);
      mutated = true;
    }
  });

  return mutated;
};

const ensureHandledCallsInitialized = () => {
  if (handledCallsInitialized) {
    return;
  }

  if (!callDataCleared && isBrowserEnvironment) {
    try {
      const currentUserId = (window as any)?.__VIBE_CURRENT_USER_ID as string | undefined;
      const storageKey = currentUserId
        ? `${CALL_DATA_MIGRATION_PREFIX}:${currentUserId}`
        : `${CALL_DATA_MIGRATION_PREFIX}:global`;
      const hasCleared = window.localStorage.getItem(storageKey);
      const storedVersion = window.localStorage.getItem(HANDLED_CALLS_VERSION_KEY);

      if (!hasCleared || storedVersion !== HANDLED_CALLS_VERSION) {
        void clearPreUpdateCallData(currentUserId);
        window.localStorage.setItem(storageKey, new Date().toISOString());
        window.localStorage.setItem(HANDLED_CALLS_VERSION_KEY, HANDLED_CALLS_VERSION);
      }
      callDataCleared = true;
    } catch (error) {
      console.error("❌ [useCallSignaling] Failed during call data cleanup check:", error);
    }
  }

  handledCallsInitialized = true;

  if (!isBrowserEnvironment) {
    return;
  }

  try {
    const storedValue = window.localStorage.getItem(HANDLED_CALLS_STORAGE_KEY);
    if (storedValue) {
      const parsed = JSON.parse(storedValue) as Record<string, number>;
      Object.entries(parsed).forEach(([callId, timestamp]) => {
        if (typeof timestamp === "number") {
          handledCalls.set(callId, timestamp);
        }
      });
    }
  } catch (error) {
    console.error("❌ [useCallSignaling] Failed to load handled calls:", error);
  } finally {
    if (pruneExpiredHandledCalls()) {
      persistHandledCalls();
    }
  }
};

export const getHandledCalls = () => {
  ensureHandledCallsInitialized();
  return new Map(handledCalls);
};

export const addHandledCall = (callId: string) => {
  if (!callId) return;
  ensureHandledCallsInitialized();
  handledCalls.set(callId, Date.now());
  persistHandledCalls();
};

export const markCallAsHandled = (callId: string) => {
  addHandledCall(callId);
  cleanupExpiredHandledCalls();
};

export const isCallRecentlyHandled = (callId: string) => {
  if (!callId) return false;
  ensureHandledCallsInitialized();
  const timestamp = handledCalls.get(callId);
  if (!timestamp) {
    return false;
  }

  if (Date.now() - timestamp > HANDLED_CALL_TTL) {
    handledCalls.delete(callId);
    persistHandledCalls();
    return false;
  }

  return true;
};

export const cleanupExpiredHandledCalls = () => {
  if (!handledCallsInitialized) {
    ensureHandledCallsInitialized();
  }

  if (!handledCallsInitialized) {
    return;
  }

  if (pruneExpiredHandledCalls()) {
    persistHandledCalls();
  }
};

export interface CallSignal {
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  callType: "audio" | "video";
  timestamp: number;
  status: "ringing" | "accepted" | "declined" | "cancelled";
}

const STOP_RINGING_STATUSES = new Set<CallSignal["status"] | "cleared">([
  "accepted",
  "declined",
  "cancelled",
  "cleared",
]);

interface UseCallSignalingOptions {
  currentUserId?: string | null;
  onIncomingCall: (signal: CallSignal, callId: string) => void;
  onCallStatusChange: (status: string) => void;
}

export function useCallSignaling({
  currentUserId,
  onIncomingCall,
  onCallStatusChange
}: UseCallSignalingOptions) {

  // Monitor database connection
  useEffect(() => {
    let connectionUnsubscribe: (() => void) | undefined;
    let retryTimeout: NodeJS.Timeout | undefined;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const setupConnectionMonitoring = async () => {
      try {
        if (!currentUserId) {
          console.log('⏳ [useCallSignaling] Waiting for authentication...');
          return;
        }

        // Monitor connection state
        const connectedRef = ref(database, '.info/connected');
        connectionUnsubscribe = onValue(connectedRef, (snapshot) => {
          const connected = snapshot.val();
          console.log('🔌 [useCallSignaling] Firebase connection:',
            connected ? '✅ CONNECTED' : '❌ DISCONNECTED');

          if (!connected) {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`🔄 Retry attempt ${retryCount}/${MAX_RETRIES}...`);

              // Clear any existing retry timeout
              if (retryTimeout) clearTimeout(retryTimeout);

              // Attempt to reconnect after a delay
              retryTimeout = setTimeout(() => {
                console.log('🔄 Attempting to reconnect...');
                setupConnectionMonitoring();
              }, 5000 * retryCount); // Increasing delay with each retry
            } else {
              const event = new CustomEvent('showCallToast', {
                detail: {
                  message: 'Call system offline. Please check your internet connection.',
                  type: 'error'
                }
              });
              window.dispatchEvent(event);
            }
          } else {
            // Reset retry count on successful connection
            retryCount = 0;
            if (retryTimeout) clearTimeout(retryTimeout);
          }
        }, (error) => {
          console.error('❌ [useCallSignaling] Connection error:', error);
        });

        // Verify database access
        const testRef = ref(database, `users/${currentUserId}/status`);
        const status = {
          lastOnline: Date.now(),
          connected: true
        };
        await set(testRef, status);
        console.log('✅ [useCallSignaling] Database write test successful');
      } catch (error) {
        console.error('❌ [useCallSignaling] Setup error:', error);
      }
    };

    setupConnectionMonitoring();

    return () => {
      if (connectionUnsubscribe) {
        connectionUnsubscribe();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [currentUserId]);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) {
      console.log('❌ [useCallSignaling] No currentUserId, cannot listen for calls');
      return;
    }

    // Use a stable reference path
    const callPath = `calls/${currentUserId}/incoming`;

    // Check if we already have an active listener
    const existingListener = (window as any).__callListener;
    if (existingListener?.path === callPath) {
      console.log('ℹ️ [useCallSignaling] Reusing existing listener for:', callPath);
      return existingListener.cleanup;
    }

    console.log('👂 [useCallSignaling] Setting up NEW call listener for user:', currentUserId);
    const incomingCallRef = ref(database, callPath);

    // Track processed call IDs to prevent duplicate notifications
    const processedCallIds = new Set<string>();

    const unsubscribe = onValue(incomingCallRef, (snapshot) => {
      console.log('🔄 [useCallSignaling] Firebase data changed for user:', currentUserId);
      const data = snapshot.val();
      console.log('📊 [useCallSignaling] Received data:', data);

      if (data) {
        Object.entries(data).forEach(([callId, callData]: [string, any]) => {
          console.log('📥 [useCallSignaling] Processing call:', callId, callData);

          // Only process ringing calls that haven't been processed before
          if (callData.status === 'ringing' && !processedCallIds.has(callId)) {
            // Check if call is expired (older than 5 minutes)
            const CALL_EXPIRATION_MS = 5 * 60 * 1000;
            const now = Date.now();
            if (callData.timestamp && (now - callData.timestamp > CALL_EXPIRATION_MS)) {
              console.log('🕰️ [useCallSignaling] Found expired ringing call, cleaning up:', callId);
              // Remove expired call from database
              remove(ref(database, `calls/${currentUserId}/incoming/${callId}`))
                .catch(err => console.error('❌ Failed to remove expired call:', err));
              return;
            }

            if (isCallRecentlyHandled(callId)) {
              console.log('⏭️ [useCallSignaling] Skipping recently handled call:', callId);
              return;
            }

            console.log('☎️ [useCallSignaling] New incoming call detected:', callData);
            console.log('🔔 [useCallSignaling] CALLING onIncomingCall callback...');
            processedCallIds.add(callId); // Mark as processed
            onIncomingCall(callData, callId);
          } else if (callData.status === 'ringing') {
            console.log('⏭️ [useCallSignaling] Ignoring duplicate ringing call:', callId);
          } else if (callData.status && callData.status !== 'ringing') {
            // Handle status changes for non-ringing calls
            console.log('📞 [useCallSignaling] Call status update:', callData.status);
            onCallStatusChange(callData.status);

            if (STOP_RINGING_STATUSES.has(callData.status)) {
              markCallAsHandled(callId);
              processedCallIds.delete(callId);
            }
          }
        });
      } else {
        console.log('📭 [useCallSignaling] No call data found');
        // Make sure to clear the call state when there's no data
        onCallStatusChange('cleared');
        // Clear processed calls when there's no data but keep recently handled calls protected
        const handled = getHandledCalls();
        processedCallIds.forEach((callId) => {
          if (!handled.has(callId)) {
            processedCallIds.delete(callId);
          }
        });
      }
    }, (error) => {
      console.error('❌ [useCallSignaling] Firebase listener error:', error);
      console.error('❌ [useCallSignaling] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    });

    // Store the listener reference globally
    (window as any).__callListener = {
      path: `calls/${currentUserId}/incoming`,
      cleanup: () => {
        console.log('🧹 [useCallSignaling] Cleaning up listener for user:', currentUserId);
        unsubscribe();
        (window as any).__callListener = null;
      }
    };

    // Return cleanup function
    return (window as any).__callListener.cleanup;
  }, [currentUserId, onIncomingCall, onCallStatusChange]);

  // Send call signal

  const sendCallSignal = useCallback(async (
    receiverId: string,
    callType: "audio" | "video",
    callerName?: string,
    callerAvatar?: string
  ): Promise<string> => {
    if (!currentUserId) {
      console.error('❌ [useCallSignaling] Cannot send call: No current user ID');
      throw new Error('No current user');
    }
    if (!receiverId) {
      console.error('❌ [useCallSignaling] Cannot send call: No receiver ID');
      throw new Error('No receiver ID');
    }

    console.log(' [useCallSignaling] Call attempt:', {
      from: currentUserId,
      to: receiverId,
      type: callType,
      caller: callerName,
      timestamp: new Date().toISOString()
    });

    const callId = `${currentUserId}_${receiverId}_${Date.now()}`;

    const signal: CallSignal & { callId: string } = {
      callId,
      callerId: currentUserId,
      callerName,
      callerAvatar,
      callType,
      timestamp: Date.now(),
      status: 'ringing'
    };

    console.log('📤 [useCallSignaling] Signal data:', signal);
    console.log('📤 [useCallSignaling] Database instance:', database);

    try {
      // Create Firebase references
      const receiverCallRef = ref(database, `calls/${receiverId}/incoming/${signal.callId}`);
      const senderCallRef = ref(database, `calls/${currentUserId}/outgoing/${signal.callId}`);

      // First, check if the receiver already has an active call
      const receiverCallsRef = ref(database, `calls/${receiverId}/incoming`);
      const receiverSnapshot = await get(receiverCallsRef);
      if (receiverSnapshot.exists()) {
        const existingCalls = receiverSnapshot.val();
        const hasActiveCall = Object.values(existingCalls).some(
          (call: any) => call.status === 'ringing'
        );
        if (hasActiveCall) {
          console.warn('⚠️ [useCallSignaling] Receiver already has an incoming call');
          throw new Error('Receiver is busy');
        }
      }

      // Set the call signal for both parties
      await Promise.all([
        set(receiverCallRef, signal),
        set(senderCallRef, signal)
      ]);

      console.log('✅ [useCallSignaling] Call signal sent successfully:', {
        callId: signal.callId,
        receiver: receiverId,
        sender: currentUserId,
        timestamp: new Date().toISOString()
      });

      console.log('📤 [useCallSignaling] Call signal sent successfully:', callId);
      return callId;
    } catch (error: any) {
      console.error('❌ [useCallSignaling] Error sending call signal:', error);
      console.error('❌ [useCallSignaling] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  }, [currentUserId]);

  // Update call status
  const updateCallStatus = useCallback(async (
    callId: string,
    receiverId: string,
    status: "accepted" | "declined" | "cancelled" | "ringing"
  ) => {
    if (!currentUserId) {
      console.log('❌ [useCallSignaling] No current user, cannot update call status');
      return;
    }

    try {
      console.log('📞 [useCallSignaling] Updating call status:', callId, status);

      // Update receiver's incoming call status
      const receiverCallRef = ref(database, `calls/${receiverId}/incoming/${callId}`);
      const signalSnapshot = await get(receiverCallRef);

      if (signalSnapshot.exists()) {
        const signalData = signalSnapshot.val();
        const updatedSignal = {
          ...signalData,
          status,
          timestamp: Date.now() // Update timestamp for status change
        };
        await set(receiverCallRef, updatedSignal);
        console.log('✅ [useCallSignaling] Updated receiver call status:', receiverId);
      } else {
        console.log('📭 [useCallSignaling] No existing signal found for receiver:', receiverId);
      }

      // Update sender's outgoing call status
      const senderCallRef = ref(database, `calls/${currentUserId}/outgoing/${callId}`);
      const outgoingSnapshot = await get(senderCallRef);

      if (outgoingSnapshot.exists()) {
        if (status === 'declined' || status === 'cancelled') {
          // Clean up call data when call ends
          await Promise.all([
            remove(receiverCallRef),
            remove(senderCallRef)
          ]);
          console.log('🧹 [useCallSignaling] Cleaned up call data for:', callId);
        } else {
          const outgoingData = outgoingSnapshot.val();
          const updatedOutgoing = {
            ...outgoingData,
            status,
            timestamp: Date.now() // Update timestamp for status change
          };
          await set(senderCallRef, updatedOutgoing);
          console.log('✅ [useCallSignaling] Updated sender call status:', currentUserId);
        }
      } else {
        console.log('📭 [useCallSignaling] No existing signal found for sender:', currentUserId);
      }

      // Clean up immediately for declined/cancelled calls
      // For accepted calls, wait 2 seconds to ensure LiveKit connection is established
      if (status === 'declined' || status === 'cancelled') {
        console.log('🧹 [useCallSignaling] Cleaning up call data immediately');
        try {
          await Promise.all([
            remove(ref(database, `calls/${receiverId}/incoming/${callId}`)),
            remove(ref(database, `calls/${currentUserId}/outgoing/${callId}`))
          ]);
          console.log('✅ [useCallSignaling] Call data cleaned up for call:', callId);
        } catch (error: any) {
          console.error('❌ [useCallSignaling] Error cleaning up call data:', error);
          console.error('❌ [useCallSignaling] Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
      } else if (status === 'accepted') {
        console.log('🧹 [useCallSignaling] Scheduling cleanup for accepted call data in 2 seconds');
        setTimeout(async () => {
          try {
            await Promise.all([
              remove(ref(database, `calls/${receiverId}/incoming/${callId}`)),
              remove(ref(database, `calls/${currentUserId}/outgoing/${callId}`))
            ]);
            console.log('✅ [useCallSignaling] Call data cleaned up for accepted call:', callId);
          } catch (error: any) {
            console.error('❌ [useCallSignaling] Error cleaning up call data:', error);
            console.error('❌ [useCallSignaling] Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            });
          }
        }, 2000);
      }

      console.log('📞 [useCallSignaling] Call status updated:', callId, status);
      onCallStatusChange(status);
    } catch (error: any) {
      console.error('❌ [useCallSignaling] Error updating call status:', error);
      console.error('❌ [useCallSignaling] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
  }, [currentUserId, onCallStatusChange]);

  // Accept call
  const acceptCall = useCallback(async (callId: string, receiverId: string) => {
    console.log('📞 [useCallSignaling] Accepting call:', callId);
    await updateCallStatus(callId, receiverId, 'accepted');
  }, [updateCallStatus]);

  // Decline call
  const declineCall = useCallback(async (callId: string, receiverId: string) => {
    console.log('📞 [useCallSignaling] Declining call:', callId);
    await updateCallStatus(callId, receiverId, 'declined');
  }, [updateCallStatus]);

  // Cancel call
  const cancelCall = useCallback(async (callId: string, receiverId: string) => {
    console.log('📞 [useCallSignaling] Cancelling call:', callId);
    await updateCallStatus(callId, receiverId, 'cancelled');
  }, [updateCallStatus]);

  return {
    sendCallSignal,
    acceptCall,
    declineCall,
    cancelCall,
  };
}