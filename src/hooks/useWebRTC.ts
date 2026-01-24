"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

export type CallType = "audio" | "video";

interface UseWebRTCOptions {
  signalingUrl: string;
  currentUserId?: string | null;
  otherUserId?: string | null;
  channelId?: string | null;
}

interface UseWebRTCReturn {
  // state
  inCall: boolean;
  callType: CallType | null;
  incomingFromUserId: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | "idle";
  turnConfigured: boolean;
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

export function useWebRTC({ signalingUrl, currentUserId, otherUserId, channelId }: UseWebRTCOptions): UseWebRTCReturn {
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingFromUserId, setIncomingFromUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | "idle">("idle");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [audioInputId, setAudioInputId] = useState<string | null>(null);
  const [videoInputId, setVideoInputId] = useState<string | null>(null);
  const [audioOutputId, setAudioOutputId] = useState<string | null>(null);
  const [turnConfigured, setTurnConfigured] = useState<boolean>(false);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callStartMs, setCallStartMs] = useState<number | null>(null);

  const canSignal = !!(currentUserId && otherUserId && channelId);

  const iceServers = useMemo(() => {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    const servers: RTCIceServer[] = [
      { urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] },
    ];
    if (turnUrl && turnUser && turnCred) {
      servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    }
    return { iceServers: servers };
  }, []);

  useEffect(() => {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
    const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
    setTurnConfigured(!!(turnUrl && turnUser && turnCred));
  }, []);

  // Setup socket connection and auth
  useEffect(() => {
    if (!signalingUrl || !canSignal) return;

    const socket = io(`${signalingUrl}/webrtcSignaling`, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (currentUserId && channelId) {
        socket.emit("authenticate", { userId: currentUserId, channelId });
      }
    });

    socket.on("offer", async ({ from, sdp, renegotiate }: { from: string; sdp: any; renegotiate?: boolean }) => {
      // If this is a renegotiation while already in call, apply immediately
      if (renegotiate && inCall) {
        if (!pcRef.current) await createPeerConnection();
        const pc = pcRef.current!;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        // We won't auto-add local video here; remote might be adding a new track.
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socketRef.current && otherUserId) {
          socketRef.current.emit("answer", { targetUserId: otherUserId, sdp: pc.localDescription });
        }
        return;
      }

      // Otherwise treat as a new incoming call
      pendingRemoteOffer.current = sdp;
      setIncomingFromUserId(from || otherUserId || null);
    });

    socket.on("answer", async ({ sdp }: { sdp: any }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      setIsCalling(false);
    });

    socket.on("ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    });

    socket.on("call-declined", () => {
      // Remote declined our call
      cleanup();
      try {
        window.dispatchEvent(new CustomEvent('callDeclined'));
      } catch { }
      setIsCalling(false);
    });

    socket.on("hangup", () => {
      // Remote hung up
      cleanup();
      try {
        window.dispatchEvent(new CustomEvent('remoteHangup'));
      } catch { }
      setIsCalling(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalingUrl, canSignal, currentUserId, channelId, otherUserId, inCall]);

  const createPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    // remote stream
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((t) => remote.addTrack(t));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && otherUserId) {
        socketRef.current.emit("ice-candidate", { targetUserId: otherUserId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanup();
      }
    };
  }, [iceServers, otherUserId]);

  // Set call start time when connection is established
  useEffect(() => {
    if (connectionState === 'connected' && inCall && !callStartMs) {
      setCallStartMs(Date.now());
    }
  }, [connectionState, inCall, callStartMs]);

  // Cache for pending remote offer before user accepts
  const pendingRemoteOffer = useRef<any | null>(null);

  const attachLocalStream = (stream: MediaStream, withVideo: boolean) => {
    setLocalStream(stream);
    setIsCameraOn(withVideo);
    setIsMuted(false);
    if (pcRef.current) {
      stream.getTracks().forEach((track) => {
        pcRef.current!.addTrack(track, stream);
      });
    }
  };

  const startCall = useCallback(async (type: CallType) => {
    if (!canSignal) return;
    if (!socketRef.current) return;

    // Create pc if needed
    if (!pcRef.current) await createPeerConnection();

    const constraints: MediaStreamConstraints = type === "video" ? {
      audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
      video: videoInputId ? { deviceId: { exact: videoInputId } } : true,
    } : {
      audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    attachLocalStream(stream, type === "video");

    const offer = await pcRef.current!.createOffer();
    await pcRef.current!.setLocalDescription(offer);

    socketRef.current.emit("offer", { targetUserId: otherUserId, sdp: pcRef.current!.localDescription });

    setInCall(true);
    setCallType(type);
    setIsCalling(true);
    // Don't set callStartMs here - wait for connection to be established
  }, [canSignal, createPeerConnection, otherUserId, audioInputId, videoInputId]);

  const startVoiceCall = useCallback(async () => {
    await startCall("audio");
  }, [startCall]);

  const startVideoCall = useCallback(async () => {
    await startCall("video");
  }, [startCall]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((m) => !m);
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOn((c) => !c);
  }, [localStream]);

  const cleanup = useCallback(() => {
    setInCall(false);
    setCallType(null);
    setIncomingFromUserId(null);
    setIsMuted(false);
    setIsCameraOn(false);
    setCallStartMs(null);

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      try { pcRef.current.close(); } catch { }
      pcRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, [localStream]);

  const hangUp = useCallback(() => {
    if (socketRef.current && otherUserId) {
      socketRef.current.emit("hangup", { targetUserId: otherUserId });
    }
    cleanup();
    // We can optionally emit a hangup event to notify peer to stop UI
  }, [cleanup]);

  const acceptIncomingCall = useCallback(async () => {
    if (!pendingRemoteOffer.current) return;
    if (!pcRef.current) await createPeerConnection();
    const pc = pcRef.current!;
    await pc.setRemoteDescription(new RTCSessionDescription(pendingRemoteOffer.current));
    // We default to audio on accept; user can promote to video later
    if (!localStream) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
      });
      attachLocalStream(stream, false);
      setCallType("audio");
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (socketRef.current && otherUserId) {
      socketRef.current.emit("answer", { targetUserId: otherUserId, sdp: pc.localDescription });
    }
    setInCall(true);
    setIncomingFromUserId(null);
    pendingRemoteOffer.current = null;
    // Don't set callStartMs here - wait for connection to be established
  }, [createPeerConnection, localStream, otherUserId, audioInputId]);

  const acceptIncomingCallWithVideo = useCallback(async () => {
    if (!pendingRemoteOffer.current) return;
    if (!pcRef.current) await createPeerConnection();
    const pc = pcRef.current!;
    await pc.setRemoteDescription(new RTCSessionDescription(pendingRemoteOffer.current));
    if (!localStream) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
        video: videoInputId ? { deviceId: { exact: videoInputId } } : true,
      });
      attachLocalStream(stream, true);
      setCallType("video");
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (socketRef.current && otherUserId) {
      socketRef.current.emit("answer", { targetUserId: otherUserId, sdp: pc.localDescription });
    }
    setInCall(true);
    setIncomingFromUserId(null);
    pendingRemoteOffer.current = null;
    // Don't set callStartMs here - wait for connection to be established
  }, [createPeerConnection, localStream, otherUserId, audioInputId, videoInputId]);

  const declineIncomingCall = useCallback(() => {
    if (socketRef.current && otherUserId) {
      socketRef.current.emit("call-declined", { targetUserId: otherUserId });
    }
    pendingRemoteOffer.current = null;
    setIncomingFromUserId(null);
    try {
      window.dispatchEvent(new CustomEvent('callMissed'));
    } catch { }
  }, [otherUserId]);

  // Auto-timeout for incoming calls (30s)
  useEffect(() => {
    if (incomingFromUserId && !inCall) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        declineIncomingCall();
      }, 30000);
    } else if (!incomingFromUserId) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [incomingFromUserId, inCall, declineIncomingCall]);

  // Upgrade active audio call to video via renegotiation
  const upgradeToVideo = useCallback(async () => {
    if (!inCall) return;
    if (!pcRef.current) await createPeerConnection();
    const pc = pcRef.current!;
    // Add camera track if not present
    const hasVideo = localStream?.getVideoTracks().some(t => t.readyState === 'live') ?? false;
    if (!hasVideo) {
      const cam = await navigator.mediaDevices.getUserMedia({
        video: videoInputId ? { deviceId: { exact: videoInputId } } : true,
      });
      const camTrack = cam.getVideoTracks()[0];
      if (localStream) {
        localStream.addTrack(camTrack);
      } else {
        const s = new MediaStream([camTrack]);
        setLocalStream(s);
      }
      pc.addTrack(camTrack, localStream || new MediaStream([camTrack]));
      setIsCameraOn(true);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (socketRef.current && otherUserId) {
      socketRef.current.emit("offer", { targetUserId: otherUserId, sdp: pc.localDescription, renegotiate: true });
    }
    setCallType("video");
  }, [createPeerConnection, inCall, localStream, otherUserId]);

  return {
    inCall,
    callType,
    incomingFromUserId,
    isMuted,
    isCameraOn,
    localStream,
    remoteStream,
    connectionState,
    turnConfigured,
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
    enumerateDevices: async () => navigator.mediaDevices.enumerateDevices(),
  };
}
