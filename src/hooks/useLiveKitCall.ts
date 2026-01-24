"use client";

import { useCallback, useState, useEffect } from "react";
import { Room, RoomEvent, Track, RemoteTrack } from "livekit-client";
import { useCallSignaling, type CallSignal } from "./useCallSignaling";
import { ref, remove } from "firebase/database";
import { database } from "@/lib/firebase";
import { useCallStore } from "@/stores/call-store";

export type CallType = "audio" | "video";

interface UseLiveKitCallOptions {
  currentUserId?: string | null;
  otherUserId?: string | null;
  channelId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
}

interface UseLiveKitCallReturn {
  // state
  inCall: boolean;
  callType: CallType | null;
  incomingFromUserId: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: string;
  isCalling: boolean;
  callStartMs: number | null;

  // actions
  startVoiceCall: () => Promise<void>;
  startVideoCall: () => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  upgradeToVideo: () => Promise<void>;
  acceptIncomingCallWithVideo: () => Promise<void>;

  // devices
  audioInputId: string | null;
  videoInputId: string | null;
  audioOutputId: string | null;
  setAudioInputId: (id: string | null) => void;
  setVideoInputId: (id: string | null) => void;
  setAudioOutputId: (id: string | null) => void;
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
}

export function useLiveKitCall({
  currentUserId,
  otherUserId,
  channelId,
  currentUserName,
  currentUserAvatar
}: UseLiveKitCallOptions): UseLiveKitCallReturn {
  const [room, setRoom] = useState<Room | null>(null);
  // Use call store for shared state
  const callStore = useCallStore();
  
  // Keep local-only state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("idle");
  const [isCalling, setIsCalling] = useState(false);
  const [callStartMs, setCallStartMs] = useState<number | null>(null);

  // Get shared state from store
  const inCall = callStore.isInCall;
  const callType = callStore.callType;
  const currentCallId = callStore.currentCallId;
  const incomingFromUserId = callStore.incomingCall?.signal.callerId || null;
  const setCallType = useCallback((type: CallType | null) => {
    callStore.setCallType(type);
  }, [callStore]);

  const [callTimeoutId, setCallTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Device management
  const [audioInputId, setAudioInputId] = useState<string | null>(null);
  const [videoInputId, setVideoInputId] = useState<string | null>(null);
  const [audioOutputId, setAudioOutputId] = useState<string | null>(null);

  const canCall = !!(currentUserId && otherUserId && channelId);

  // Real-time call signaling
  const { sendCallSignal, acceptCall, declineCall, cancelCall } = useCallSignaling({
    currentUserId,
    onIncomingCall: (signal, callId) => {
      console.log('📞 [useLiveKitCall] Incoming call signal received:', signal);
      console.log('📞 [useLiveKitCall] Call ID:', callId);
      
      // Only process if we're not already in a call
      if (!inCall && !isCalling) {
        console.log('📞 [useLiveKitCall] Processing incoming call...');
        callStore.setIncomingCall({ signal, callId });
        callStore.setCallType(signal.callType);
        
        // Set a timeout to automatically decline the call after 120 seconds (2 minutes) if not answered
        const timeoutId = setTimeout(() => {
          console.log('⏰ [useLiveKitCall] Incoming call auto-declined after 2 minutes');
          if (currentCallId === callId) {
            declineIncomingCall();
            // Show toast notification
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('showCallToast', {
                detail: { message: 'Call automatically declined after 2 minutes' }
              });
              window.dispatchEvent(event);
            }
          }
        }, 120000);
        
        setCallTimeoutId(timeoutId);
      } else {
        console.log('📞 [useLiveKitCall] Ignoring incoming call - already in a call');
      }
    },
    onCallStatusChange: (status) => {
      console.log('📞 [useLiveKitCall] Call status changed:', status);
      
      if (status === 'accepted') {
        // Clear timeout when call is accepted
        if (callTimeoutId) {
          clearTimeout(callTimeoutId);
          setCallTimeoutId(null);
        }
        setIsCalling(false);
        
        // If we're the caller, now we can connect to LiveKit
        // The receiver already connected when they accepted
        if (!incomingFromUserId && currentCallId && otherUserId) {
          console.log('📞 [useLiveKitCall] Caller connecting to LiveKit after call accepted');
          connectToRoom(callType || 'audio').catch(error => {
            console.error('❌ [useLiveKitCall] Error connecting to room after acceptance:', error);
            cleanup();
          });
        }
      } else if (status === 'declined' || status === 'cancelled') {
        // Clean up when call is declined or cancelled
        callStore.setIncomingCall(null);
        callStore.setCallType(null);
        callStore.setCurrentCallId(null);
        if (callTimeoutId) {
          clearTimeout(callTimeoutId);
          setCallTimeoutId(null);
        }
      }
    },
  });

  // Get access token from your backend
  const getAccessToken = useCallback(async (roomName: string, participantName: string) => {
    try {
      const response = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get access token');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }, []);

  const cleanup = useCallback(() => {
    console.log('🧹 [useLiveKitCall] Starting cleanup...');
    
    // Clear any active timeout
    if (callTimeoutId) {
      console.log('⏲️ [useLiveKitCall] Clearing call timeout');
      clearTimeout(callTimeoutId);
      setCallTimeoutId(null);
    }

    // Reset all call states
    console.log('🔄 [useLiveKitCall] Resetting all call states');
    callStore.setIsInCall(false);
    callStore.setCallType(null);
    callStore.setIncomingCall(null);
    callStore.setCurrentCallId(null);
    setIsMuted(false);
    setIsCameraOn(false);
    setCallStartMs(null);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('idle');
    setIsCalling(false);

    // Disconnect from LiveKit room if connected
    if (room) {
      console.log('🔌 [useLiveKitCall] Disconnecting from LiveKit room');
      room.disconnect();
      setRoom(null);
    }

    // Clear any ongoing ringtones by dispatching an event
    if (typeof window !== 'undefined') {
      console.log('🔔 [useLiveKitCall] Dispatching stopRingtone event');
      window.dispatchEvent(new Event('stopRingtone'));
    }

    // Clear any call popups by dispatching an event
    if (typeof window !== 'undefined') {
      console.log('❌ [useLiveKitCall] Dispatching closeCallPopup event');
      window.dispatchEvent(new Event('closeCallPopup'));
    }
  }, [room, callTimeoutId]);

  const connectToRoom = useCallback(async (type: CallType) => {
    if (!canCall || !otherUserId) return;

    try {
      // Create room name from conversation
      const roomName = `call_${[currentUserId, otherUserId].sort().join('_')}`;

      // Get access token
      const token = await getAccessToken(roomName, currentUserId!);

      // Create and connect to room
      const newRoom = new Room();
      setRoom(newRoom);

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to room');
        setConnectionState('connected');
        callStore.setIsInCall(true);
        setCallStartMs(Date.now());
        setIsCalling(false);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        setConnectionState('disconnected');
        cleanup();
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          if (track.kind === Track.Kind.Video) {
            setRemoteStream(new MediaStream([track.mediaStreamTrack]));
          }
        }
      });

      // Connect to room
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);

      // Enable local tracks
      const audioEnabled = true;
      const videoEnabled = type === 'video';

      if (audioEnabled) {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
      }
      if (videoEnabled) {
        await newRoom.localParticipant.setCameraEnabled(true);
      }

      if (videoEnabled) {
        setIsCameraOn(true);
      }

      setCallType(type);

      // Get local stream
      const localTracks = newRoom.localParticipant.audioTrackPublications;
      if (localTracks.size > 0) {
        const audioTrack = Array.from(localTracks.values())[0].track;
        if (audioTrack) {
          setLocalStream(new MediaStream([audioTrack.mediaStreamTrack]));
        }
      }

    } catch (error) {
      console.error('Error connecting to room:', error);
      setIsCalling(false);
      cleanup();
    }
  }, [canCall, currentUserId, otherUserId, getAccessToken, cleanup]);

  const startCall = useCallback(async (type: CallType) => {
    if (!canCall || !otherUserId) return;

    try {
      console.log('🎬 [useLiveKitCall] Starting call:', type);
      console.log('🎬 [useLiveKitCall] Current user:', currentUserId);
      console.log('🎬 [useLiveKitCall] Other user:', otherUserId);
      console.log('🎬 [useLiveKitCall] Channel:', channelId);
      
      setIsCalling(true);
      callStore.setCallType(type);

      // Send call signal to receiver
      console.log('🎬 [useLiveKitCall] Calling sendCallSignal...');
      const callId = await sendCallSignal(
        otherUserId,
        type,
        currentUserName,
        currentUserAvatar
      );
      console.log('🎬 [useLiveKitCall] sendCallSignal completed, callId:', callId);
      callStore.setCurrentCallId(callId);

      // Set auto-cancel timer for 2 minutes
      console.log('⏲️ [useLiveKitCall] Starting 120-second call timeout');
      const timeoutId = setTimeout(async () => {
        console.log('⏰ [useLiveKitCall] Call timeout reached - auto-cancelling');
        try {
          if (callId && otherUserId) {
            // Clean up Firebase call data
            const receiverRef = ref(database, `calls/${otherUserId}/incoming`);
            const senderRef = ref(database, `calls/${currentUserId}/outgoing`);
            
            await Promise.all([
              remove(receiverRef),
              remove(senderRef),
              cancelCall(callId, otherUserId)
            ]);

            // Show toast notification
            const event = new CustomEvent('showCallToast', {
              detail: { 
                message: 'Call automatically cancelled after 2 minutes',
                type: 'info'
              }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.error('❌ Error during call timeout cleanup:', error);
        }
        
        setIsCalling(false);
        callStore.setCurrentCallId(null);
        // We can't call cleanup directly here because of dependency issues
        // Reset the states manually
        callStore.setIsInCall(false);
        callStore.setCallType(null);
        callStore.setIncomingCall(null);
        callStore.setCurrentCallId(null);
        setIsMuted(false);
        setIsCameraOn(false);
        setCallStartMs(null);
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('idle');
        setIsCalling(false);
        
        if (room) {
          room.disconnect();
          setRoom(null);
        }
      }, 120000); // 120 seconds (2 minutes)

      setCallTimeoutId(timeoutId);

      // NOTE: We don't connect to the LiveKit room here immediately
      // The connection will be established when the receiver accepts the call
      // This is handled in the acceptIncomingCall functions
    } catch (error) {
      console.error('❌ [useLiveKitCall] Error starting call:', error);
      console.error('❌ [useLiveKitCall] Error details:', error);
      setIsCalling(false);
        setIsCalling(false);
        // We can't call cleanup directly here because of dependency issues
        // Reset the states manually
        callStore.setIsInCall(false);
        callStore.setCallType(null);
        callStore.setIncomingCall(null);
        callStore.setCurrentCallId(null);
        setIsMuted(false);
        setIsCameraOn(false);
        setCallStartMs(null);
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionState('idle');
        setIsCalling(false);      if (room) {
        room.disconnect();
        setRoom(null);
      }
    }
  }, [canCall, currentUserId, otherUserId, sendCallSignal, cancelCall, room]);

  const startVoiceCall = useCallback(async () => {
    await startCall("audio");
  }, [startCall]);

  const startVideoCall = useCallback(async () => {
    await startCall("video");
  }, [startCall]);



  const toggleMute = useCallback(async () => {
    if (!room) return;

    const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack) {
      if (audioTrack.isMuted) {
        await audioTrack.unmute();
        setIsMuted(false);
      } else {
        await audioTrack.mute();
        setIsMuted(true);
      }
    }
  }, [room]);

  const toggleCamera = useCallback(async () => {
    if (!room) return;

    const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (videoTrack) {
      if (videoTrack.isMuted) {
        await videoTrack.unmute();
        setIsCameraOn(true);
      } else {
        await videoTrack.mute();
        setIsCameraOn(false);
      }
    }
  }, [room]);

  const hangUp = useCallback(async () => {
    if (currentCallId && otherUserId) {
      if (isCalling) {
        // If we're the caller, cancel the call
        await cancelCall(currentCallId, otherUserId);
      }
    }
    cleanup();
  }, [cleanup, currentCallId, otherUserId, isCalling, cancelCall]);

  const acceptIncomingCall = useCallback(async () => {
    if (!currentCallId || !otherUserId) return;

    try {
      console.log('📞 [useLiveKitCall] Accepting incoming call...');
      
      // Clear incoming call state and stop ringtone/popup immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('stopRingtone'));
        window.dispatchEvent(new Event('closeCallPopup'));
      }
      callStore.setIncomingCall(null);
      callStore.setCurrentCallId(currentCallId);
      callStore.setCallType('audio');
      
      // Accept the call signal first
      await acceptCall(currentCallId, otherUserId);
      console.log('✅ [useLiveKitCall] Call signal accepted');

      // Try to connect to LiveKit room
      console.log('🔌 [useLiveKitCall] Connecting to LiveKit room...');
      await connectToRoom("audio");
      console.log('✅ [useLiveKitCall] Connected to LiveKit room');
    } catch (error) {
      console.error('❌ [useLiveKitCall] Error accepting call:', error);
      
      // If the error happens after accepting but before LiveKit connects,
      // we need to clean up the call signal
      if (currentCallId && otherUserId) {
        try {
          await cancelCall(currentCallId, otherUserId);
          console.log('✅ [useLiveKitCall] Cleaned up failed call attempt');
        } catch (cleanupError) {
          console.error('❌ [useLiveKitCall] Error cleaning up failed call:', cleanupError);
        }
      }
      
      cleanup();
    }
  }, [currentCallId, otherUserId, acceptCall, connectToRoom, cleanup]);

  const acceptIncomingCallWithVideo = useCallback(async () => {
    if (!currentCallId || !otherUserId) return;

    try {
      console.log('📞 [useLiveKitCall] Accepting incoming video call...');
      
      // Clear incoming call state and stop ringtone/popup immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('stopRingtone'));
        window.dispatchEvent(new Event('closeCallPopup'));
      }
      callStore.setIncomingCall(null);
      callStore.setCurrentCallId(currentCallId);
      callStore.setCallType('video');
      
      // Accept the call signal first
      await acceptCall(currentCallId, otherUserId);
      console.log('✅ [useLiveKitCall] Video call signal accepted');

      // Try to connect to LiveKit room
      console.log('🔌 [useLiveKitCall] Connecting to LiveKit room with video...');
      await connectToRoom("video");
      console.log('✅ [useLiveKitCall] Connected to LiveKit room with video');
    } catch (error) {
      console.error('❌ [useLiveKitCall] Error accepting video call:', error);
      
      // If the error happens after accepting but before LiveKit connects,
      // we need to clean up the call signal
      if (currentCallId && otherUserId) {
        try {
          await cancelCall(currentCallId, otherUserId);
          console.log('✅ [useLiveKitCall] Cleaned up failed video call attempt');
        } catch (cleanupError) {
          console.error('❌ [useLiveKitCall] Error cleaning up failed video call:', cleanupError);
        }
      }
      
      cleanup();
    }
  }, [currentCallId, otherUserId, acceptCall, connectToRoom, cleanup]);

  const declineIncomingCall = useCallback(async () => {
    console.log('📞 [useLiveKitCall] Declining incoming call');
    
    // Clear incoming call state and stop ringtone/popup immediately
    callStore.setIncomingCall(null);
    callStore.setCurrentCallId(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('stopRingtone'));
    }

    if (currentCallId && otherUserId) {
      try {
        await declineCall(currentCallId, otherUserId);
        console.log('✅ [useLiveKitCall] Call declined successfully');
      } catch (error) {
        console.error('❌ [useLiveKitCall] Error declining call:', error);
      }
    }

    cleanup();
  }, [currentCallId, otherUserId, declineCall, cleanup]);

  const upgradeToVideo = useCallback(async () => {
    if (!room || !inCall) return;

    try {
      await room.localParticipant.setCameraEnabled(true);
      setIsCameraOn(true);
      callStore.setCallType("video");
    } catch (error) {
      console.error('Error upgrading to video:', error);
    }
  }, [room, inCall]);

  const enumerateDevices = useCallback(async () => {
    return await navigator.mediaDevices.enumerateDevices();
  }, []);

  return {
    inCall,
    callType,
    incomingFromUserId,
    isMuted,
    isCameraOn,
    localStream,
    remoteStream,
    connectionState,
    isCalling,
    callStartMs,
    startVoiceCall,
    startVideoCall,
    hangUp,
    toggleMute,
    toggleCamera,
    acceptIncomingCall,
    declineIncomingCall,
    upgradeToVideo,
    acceptIncomingCallWithVideo,
    audioInputId,
    videoInputId,
    audioOutputId,
    setAudioInputId,
    setVideoInputId,
    setAudioOutputId,
    enumerateDevices,
  };
}