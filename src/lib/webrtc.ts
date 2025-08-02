import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';

// Types
export type MediaType = 'audio' | 'video' | 'screen';
export type WebRTCUser = {
  id: string;
  stream?: MediaStream;
  peer?: SimplePeer.Instance;
};

export type WebRTCState = {
  localStream: MediaStream | null;
  remoteUsers: WebRTCUser[];
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  error: string | null;
};

// Configuration
const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL || 'https://us-central1-vibe-app.cloudfunctions.net';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// WebRTC Service Class
class WebRTCService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private currentChannelId: string | null = null;
  private currentUserId: string | null = null;
  private listeners: Set<(state: Partial<WebRTCState>) => void> = new Set();
  private state: WebRTCState = {
    localStream: null,
    remoteUsers: [],
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    error: null,
  };

  // Singleton pattern
  private static instance: WebRTCService;
  public static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  private constructor() {}

  // Initialize the socket connection
  private initializeSocket() {
    if (this.socket) return;

    this.socket = io(`${SIGNALING_SERVER_URL}/webrtcSignaling`);

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.updateState({ isConnected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.updateState({ isConnected: false });
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.updateState({ error: error.message });
    });

    this.socket.on('user-joined', ({ userId, channelParticipants }) => {
      console.log(`User ${userId} joined the channel`);
      if (userId !== this.currentUserId) {
        this.createPeer(userId, true);
      }
    });

    this.socket.on('user-left', ({ userId }) => {
      console.log(`User ${userId} left the channel`);
      this.removePeer(userId);
    });

    this.socket.on('offer', async ({ from, sdp }) => {
      console.log(`Received offer from ${from}`);
      const peer = this.createPeer(from, false);
      await peer.signal(sdp);
    });

    this.socket.on('answer', async ({ from, sdp }) => {
      console.log(`Received answer from ${from}`);
      const peer = this.peers.get(from);
      if (peer) {
        await peer.signal(sdp);
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      console.log(`Received ICE candidate from ${from}`);
      const peer = this.peers.get(from);
      if (peer) {
        await peer.signal(candidate);
      }
    });
  }

  // Create a peer connection
  private createPeer(userId: string, initiator: boolean): SimplePeer.Instance {
    if (this.peers.has(userId)) {
      return this.peers.get(userId)!;
    }

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream || undefined,
      trickle: true,
      config: { iceServers: ICE_SERVERS },
    });

    peer.on('signal', (data) => {
      if (this.socket) {
        if (initiator) {
          this.socket.emit('offer', { targetUserId: userId, sdp: data });
        } else {
          this.socket.emit('answer', { targetUserId: userId, sdp: data });
        }
      }
    });

    peer.on('stream', (stream) => {
      console.log(`Received stream from ${userId}`);
      this.remoteStreams.set(userId, stream);
      this.updateRemoteUsers();
    });

    peer.on('close', () => {
      console.log(`Peer connection with ${userId} closed`);
      this.removePeer(userId);
    });

    peer.on('error', (err) => {
      console.error(`Peer connection error with ${userId}:`, err);
      this.updateState({ error: `Peer connection error: ${err.message}` });
    });

    this.peers.set(userId, peer);
    this.updateRemoteUsers();
    return peer;
  }

  // Remove a peer connection
  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.destroy();
      this.peers.delete(userId);
    }
    this.remoteStreams.delete(userId);
    this.updateRemoteUsers();
  }

  // Update the list of remote users
  private updateRemoteUsers() {
    const remoteUsers: WebRTCUser[] = [];
    this.peers.forEach((peer, userId) => {
      remoteUsers.push({
        id: userId,
        stream: this.remoteStreams.get(userId),
        peer,
      });
    });
    this.updateState({ remoteUsers });
  }

  // Update the state and notify listeners
  private updateState(newState: Partial<WebRTCState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Join a channel
  public async joinChannel(channelId: string, userId: string, mediaType: MediaType = 'audio') {
    try {
      this.updateState({ isConnecting: true, error: null });
      this.currentChannelId = channelId;
      this.currentUserId = userId;

      // Initialize socket if not already done
      this.initializeSocket();

      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: mediaType === 'video',
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.updateState({ localStream: this.localStream });

      // Authenticate with the signaling server
      if (this.socket) {
        this.socket.emit('authenticate', { userId, channelId });
      }

      this.updateState({ isConnecting: false, isConnected: true });
      return true;
    } catch (error: any) {
      console.error('Error joining channel:', error);
      this.updateState({
        isConnecting: false,
        isConnected: false,
        error: error.message || 'Failed to join channel',
      });
      return false;
    }
  }

  // Leave the current channel
  public async leaveChannel() {
    try {
      // Close all peer connections
      this.peers.forEach((peer) => peer.destroy());
      this.peers.clear();
      this.remoteStreams.clear();

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }

      // Disconnect from signaling server
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.currentChannelId = null;
      this.currentUserId = null;

      this.updateState({
        localStream: null,
        remoteUsers: [],
        isConnected: false,
        isConnecting: false,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      console.error('Error leaving channel:', error);
      this.updateState({
        error: error.message || 'Failed to leave channel',
      });
      return false;
    }
  }

  // Toggle mute
  public toggleMute() {
    if (!this.localStream) return false;

    const audioTracks = this.localStream.getAudioTracks();
    const newMuteState = !this.state.isMuted;

    audioTracks.forEach((track) => {
      track.enabled = !newMuteState;
    });

    this.updateState({ isMuted: newMuteState });
    return true;
  }

  // Toggle camera
  public toggleCamera() {
    if (!this.localStream) return false;

    const videoTracks = this.localStream.getVideoTracks();
    const newCameraState = !this.state.isCameraOff;

    videoTracks.forEach((track) => {
      track.enabled = !newCameraState;
    });

    this.updateState({ isCameraOff: newCameraState });
    return true;
  }

  // Toggle screen sharing
  public async toggleScreenShare() {
    try {
      if (this.state.isScreenSharing) {
        // Stop screen sharing
        if (this.localStream) {
          const videoTracks = this.localStream.getVideoTracks();
          videoTracks.forEach((track) => track.stop());
        }

        // Get back to camera if we were in video mode
        if (!this.state.isCameraOff) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = videoStream.getVideoTracks()[0];

          if (this.localStream) {
            this.localStream.addTrack(videoTrack);

            // Update all peers with the new track
            this.peers.forEach((peer) => {
              peer.removeStream(this.localStream!);
              peer.addStream(this.localStream!);
            });
          }
        }

        this.updateState({ isScreenSharing: false });
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in local stream
        if (this.localStream) {
          const videoTracks = this.localStream.getVideoTracks();
          videoTracks.forEach((track) => {
            this.localStream!.removeTrack(track);
            track.stop();
          });

          this.localStream.addTrack(screenTrack);

          // Update all peers with the new track
          this.peers.forEach((peer) => {
            peer.removeStream(this.localStream!);
            peer.addStream(this.localStream!);
          });
        }

        // Handle when user stops sharing screen via the browser UI
        screenTrack.onended = () => {
          this.toggleScreenShare();
        };

        this.updateState({ isScreenSharing: true, isCameraOff: false });
      }

      return true;
    } catch (error: any) {
      console.error('Error toggling screen share:', error);
      this.updateState({
        error: error.message || 'Failed to toggle screen sharing',
      });
      return false;
    }
  }

  // Subscribe to state changes
  public subscribe(listener: (state: Partial<WebRTCState>) => void) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  // Get current state
  public getState(): WebRTCState {
    return { ...this.state };
  }
}

// React Hook for using WebRTC
export function useWebRTC() {
  const webRTCService = WebRTCService.getInstance();
  const [state, setState] = useState<WebRTCState>(webRTCService.getState());

  useEffect(() => {
    const unsubscribe = webRTCService.subscribe((newState) => {
      setState((prevState) => ({ ...prevState, ...newState }));
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    joinChannel: webRTCService.joinChannel.bind(webRTCService),
    leaveChannel: webRTCService.leaveChannel.bind(webRTCService),
    toggleMute: webRTCService.toggleMute.bind(webRTCService),
    toggleCamera: webRTCService.toggleCamera.bind(webRTCService),
    toggleScreenShare: webRTCService.toggleScreenShare.bind(webRTCService),
  };
}

export default WebRTCService;