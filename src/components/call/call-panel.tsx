import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MicOff, Mic, Video, VideoOff, PhoneOff, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CallPanelProps {
  inCall: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  callType: "audio" | "video" | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onHangUp: () => void;
  onUpgradeToVideo?: () => void;
  callStartMs?: number | null;
  connectionState: RTCPeerConnectionState | "idle";
  // Device props
  audioInputId: string | null;
  videoInputId: string | null;
  audioOutputId: string | null;
  setAudioInputId: (id: string | null) => void;
  setVideoInputId: (id: string | null) => void;
  setAudioOutputId: (id: string | null) => void;
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
}

export default function CallPanel({
  inCall,
  isMuted,
  isCameraOn,
  callType,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleCamera,
  onHangUp,
  onUpgradeToVideo,
  callStartMs,
  connectionState,
  audioInputId,
  videoInputId,
  audioOutputId,
  setAudioInputId,
  setVideoInputId,
  setAudioOutputId,
  enumerateDevices,
}: CallPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [clock, setClock] = React.useState<string>("");

  // Device lists
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
        void localVideoRef.current.play().catch(() => { });
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        // Set audio output device if supported and selected
        if (audioOutputId && 'setSinkId' in remoteVideoRef.current) {
          // @ts-ignore - setSinkId is experimental/browser-specific
          remoteVideoRef.current.setSinkId(audioOutputId).catch(console.error);
        }
        void remoteVideoRef.current.play().catch(() => { });
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream, audioOutputId]);

  useEffect(() => {
    if (!inCall || !callStartMs) { setClock(""); return; }
    const fmt = (ms: number) => {
      const s = Math.floor(ms / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };
    setClock(fmt(Date.now() - callStartMs));
    const id = setInterval(() => setClock(fmt(Date.now() - callStartMs)), 1000);
    return () => clearInterval(id);
  }, [inCall, callStartMs]);

  // Load devices when dialog opens or mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setVideoInputs(devices.filter(d => d.kind === 'videoinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch (e) {
        console.error("Error enumerating devices:", e);
      }
    };
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, [enumerateDevices]);

  if (!inCall) return null;

  const getConnectionStatusColor = (state: string) => {
    switch (state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected':
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = (state: string) => {
    switch (state) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'failed': return 'Connection Failed';
      case 'new': return 'Initializing...';
      case 'checking': return 'Checking Connection...';
      default: return state;
    }
  };

  return (
    <div className="w-full border-b border-border/40 bg-card/70 backdrop-blur-sm">
      <div className="px-3 py-2 flex items-center gap-2">
        {callType === "video" ? (
          <div className="flex items-center gap-2 w-full">
            <div className="relative rounded-md overflow-hidden bg-black/80 h-28 sm:h-36 md:h-40 flex-1">
              <video ref={remoteVideoRef} playsInline autoPlay muted={false} className="w-full h-full object-cover" />
              {/* Connection Status Overlay for Video */}
              {connectionState !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 text-xs font-medium">
                    <span className={`w-2 h-2 rounded-full ${getConnectionStatusColor(connectionState)} animate-pulse`} />
                    {getConnectionStatusText(connectionState)}
                  </div>
                </div>
              )}
            </div>
            <div className="relative rounded-md overflow-hidden bg-black/60 h-20 sm:h-24 md:h-28 w-32 sm:w-40">
              <video ref={localVideoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className={`w-2 h-2 rounded-full ${getConnectionStatusColor(connectionState)}`} />
              {getConnectionStatusText(connectionState)}
            </div>
            <div className="text-xs text-muted-foreground">
              Voice Call
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {inCall && clock && (
            <div className="text-xs text-muted-foreground tabular-nums px-2 py-1 bg-muted rounded">
              {clock}
            </div>
          )}

          {/* Settings Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] glass-panel">
              <DialogHeader>
                <DialogTitle>Call Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="microphone">Microphone</Label>
                  <Select value={audioInputId || ""} onValueChange={setAudioInputId}>
                    <SelectTrigger id="microphone">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioInputs.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="camera">Camera</Label>
                  <Select value={videoInputId || ""} onValueChange={setVideoInputId}>
                    <SelectTrigger id="camera">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoInputs.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {audioOutputs.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="speaker">Speaker</Label>
                    <Select value={audioOutputId || ""} onValueChange={setAudioOutputId}>
                      <SelectTrigger id="speaker">
                        <SelectValue placeholder="Select speaker" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioOutputs.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {callType === "audio" && onUpgradeToVideo && (
            <Button variant="outline" size="sm" className="h-8 px-2 mr-1" onClick={onUpgradeToVideo} title="Switch to video">
              <Video className="h-4 w-4 mr-1" /> Video
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleMute} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
          </Button>
          {callType === "video" && (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleCamera} title={isCameraOn ? "Turn off camera" : "Turn on camera"}>
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-muted-foreground" />}
            </Button>
          )}
          <Button variant="destructive" size="icon" className="h-9 w-9" onClick={onHangUp} title="Hang up">
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
