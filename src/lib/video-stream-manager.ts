/**
 * Video Stream Manager
 * Handles video stream management, layout decisions, and stream switching
 */

export interface VideoStreamState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  isLocalVideoEnabled: boolean;
  isRemoteVideoEnabled: boolean;
  isScreenSharing: boolean;
  screenShareSource: 'local' | 'remote' | null;
}

export interface VideoLayoutConfig {
  showLocalVideo: boolean;
  showRemoteVideo: boolean;
  showScreenShare: boolean;
  localVideoPosition: 'pip' | 'main' | 'overlay';
  remoteVideoPosition: 'pip' | 'main' | 'overlay';
  screenSharePosition: 'main' | 'overlay';
}

export class VideoStreamManager {
  private state: VideoStreamState = {
    localStream: null,
    remoteStream: null,
    screenShareStream: null,
    isLocalVideoEnabled: false,
    isRemoteVideoEnabled: false,
    isScreenSharing: false,
    screenShareSource: null,
  };

  private listeners: Set<(state: VideoStreamState) => void> = new Set();

  /**
   * Update the video stream state
   */
  public updateState(newState: Partial<VideoStreamState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Get current video stream state
   */
  public getState(): VideoStreamState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: (state: VideoStreamState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Set local video stream
   */
  public setLocalStream(stream: MediaStream | null) {
    this.updateState({ 
      localStream: stream,
      isLocalVideoEnabled: stream ? this.hasVideoTrack(stream) : false
    });
  }

  /**
   * Set remote video stream
   */
  public setRemoteStream(stream: MediaStream | null) {
    this.updateState({ 
      remoteStream: stream,
      isRemoteVideoEnabled: stream ? this.hasVideoTrack(stream) : false
    });
  }

  /**
   * Set screen share stream
   */
  public setScreenShareStream(stream: MediaStream | null, source: 'local' | 'remote' | null = null) {
    this.updateState({ 
      screenShareStream: stream,
      isScreenSharing: !!stream,
      screenShareSource: source
    });
  }

  /**
   * Toggle local video enabled state
   */
  public toggleLocalVideo(enabled?: boolean) {
    if (!this.state.localStream) return false;

    const videoTracks = this.state.localStream.getVideoTracks();
    const newState = enabled !== undefined ? enabled : !this.state.isLocalVideoEnabled;

    videoTracks.forEach(track => {
      track.enabled = newState;
    });

    this.updateState({ isLocalVideoEnabled: newState });
    return true;
  }

  /**
   * Check if a stream has video tracks
   */
  private hasVideoTrack(stream: MediaStream): boolean {
    return stream.getVideoTracks().length > 0 && 
           stream.getVideoTracks().some(track => track.enabled);
  }

  /**
   * Determine the optimal video layout configuration
   */
  public getLayoutConfig(): VideoLayoutConfig {
    const { 
      isLocalVideoEnabled, 
      isRemoteVideoEnabled, 
      isScreenSharing,
      localStream,
      remoteStream,
      screenShareStream
    } = this.state;

    // Screen sharing takes priority
    if (isScreenSharing && screenShareStream) {
      return {
        showLocalVideo: !!localStream,
        showRemoteVideo: !!remoteStream,
        showScreenShare: true,
        localVideoPosition: 'overlay',
        remoteVideoPosition: 'overlay',
        screenSharePosition: 'main'
      };
    }

    // Video call layout
    if (isLocalVideoEnabled || isRemoteVideoEnabled) {
      return {
        showLocalVideo: isLocalVideoEnabled && !!localStream,
        showRemoteVideo: isRemoteVideoEnabled && !!remoteStream,
        showScreenShare: false,
        localVideoPosition: 'pip',
        remoteVideoPosition: 'main',
        screenSharePosition: 'main'
      };
    }

    // Audio-only call
    return {
      showLocalVideo: false,
      showRemoteVideo: false,
      showScreenShare: false,
      localVideoPosition: 'pip',
      remoteVideoPosition: 'main',
      screenSharePosition: 'main'
    };
  }

  /**
   * Get the primary display stream (what should be shown in main area)
   */
  public getPrimaryStream(): MediaStream | null {
    if (this.state.isScreenSharing && this.state.screenShareStream) {
      return this.state.screenShareStream;
    }
    
    if (this.state.isRemoteVideoEnabled && this.state.remoteStream) {
      return this.state.remoteStream;
    }
    
    if (this.state.isLocalVideoEnabled && this.state.localStream) {
      return this.state.localStream;
    }
    
    return null;
  }

  /**
   * Get the secondary stream (what should be shown in picture-in-picture)
   */
  public getSecondaryStream(): MediaStream | null {
    if (this.state.isScreenSharing) {
      // During screen sharing, show participant videos in overlay
      return this.state.isRemoteVideoEnabled ? this.state.remoteStream : this.state.localStream;
    }
    
    // In regular video calls, local video goes in PiP
    if (this.state.isLocalVideoEnabled && this.state.localStream) {
      return this.state.localStream;
    }
    
    return null;
  }

  /**
   * Check if we should show video layout or audio-only layout
   */
  public shouldShowVideoLayout(): boolean {
    return this.state.isLocalVideoEnabled || 
           this.state.isRemoteVideoEnabled || 
           this.state.isScreenSharing;
  }

  /**
   * Get display information for a stream
   */
  public getStreamDisplayInfo(stream: MediaStream | null) {
    if (!stream) return { hasVideo: false, hasAudio: false };
    
    return {
      hasVideo: stream.getVideoTracks().length > 0 && 
                stream.getVideoTracks().some(track => track.enabled),
      hasAudio: stream.getAudioTracks().length > 0 && 
                stream.getAudioTracks().some(track => track.enabled)
    };
  }

  /**
   * Clean up all streams with proper error handling
   */
  public cleanup() {
    // Stop all tracks in all streams with error handling
    [this.state.localStream, this.state.remoteStream, this.state.screenShareStream]
      .filter(Boolean)
      .forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => {
            try {
              if (track.readyState !== 'ended') {
                track.stop();
              }
            } catch (error) {
              console.warn('Error stopping track:', error);
            }
          });
        }
      });

    // Reset state
    this.updateState({
      localStream: null,
      remoteStream: null,
      screenShareStream: null,
      isLocalVideoEnabled: false,
      isRemoteVideoEnabled: false,
      isScreenSharing: false,
      screenShareSource: null,
    });

    // Clear listeners
    this.listeners.clear();
  }

  /**
   * Optimized stream replacement to avoid unnecessary re-renders
   */
  public replaceStream(oldStream: MediaStream | null, newStream: MediaStream | null, type: 'local' | 'remote' | 'screenShare') {
    // Only update if streams are actually different
    if (oldStream === newStream) return;

    // Stop old stream tracks
    if (oldStream) {
      oldStream.getTracks().forEach(track => {
        try {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        } catch (error) {
          console.warn('Error stopping old track:', error);
        }
      });
    }

    // Update appropriate stream
    switch (type) {
      case 'local':
        this.setLocalStream(newStream);
        break;
      case 'remote':
        this.setRemoteStream(newStream);
        break;
      case 'screenShare':
        this.setScreenShareStream(newStream, newStream ? 'local' : null);
        break;
    }
  }
}

// Singleton instance
let videoStreamManager: VideoStreamManager | null = null;

export function getVideoStreamManager(): VideoStreamManager {
  if (!videoStreamManager) {
    videoStreamManager = new VideoStreamManager();
  }
  return videoStreamManager;
}

// React hook for using the video stream manager
import { useEffect, useState } from 'react';

export function useVideoStreamManager() {
  const manager = getVideoStreamManager();
  const [state, setState] = useState<VideoStreamState>(manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    return () => unsubscribe();
  }, [manager]);

  return {
    ...state,
    layoutConfig: manager.getLayoutConfig(),
    primaryStream: manager.getPrimaryStream(),
    secondaryStream: manager.getSecondaryStream(),
    shouldShowVideoLayout: manager.shouldShowVideoLayout(),
    setLocalStream: manager.setLocalStream.bind(manager),
    setRemoteStream: manager.setRemoteStream.bind(manager),
    setScreenShareStream: manager.setScreenShareStream.bind(manager),
    toggleLocalVideo: manager.toggleLocalVideo.bind(manager),
    getStreamDisplayInfo: manager.getStreamDisplayInfo.bind(manager),
    cleanup: manager.cleanup.bind(manager),
  };
}