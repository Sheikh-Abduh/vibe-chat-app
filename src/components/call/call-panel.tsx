"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MicOff, Mic, Video, VideoOff, PhoneOff } from "lucide-react";

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
}: CallPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [clock, setClock] = React.useState<string>("");

  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
        void localVideoRef.current.play().catch(() => {});
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => {});
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

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

  if (!inCall) return null;

  return (
    <div className="w-full border-b border-border/40 bg-card/70 backdrop-blur-sm">
      <div className="px-3 py-2 flex items-center gap-2">
        {callType === "video" ? (
          <div className="flex items-center gap-2 w-full">
            <div className="relative rounded-md overflow-hidden bg-black/80 h-28 sm:h-36 md:h-40 flex-1">
              <video ref={remoteVideoRef} playsInline autoPlay muted={false} className="w-full h-full object-cover" />
            </div>
            <div className="relative rounded-md overflow-hidden bg-black/60 h-20 sm:h-24 md:h-28 w-32 sm:w-40">
              <video ref={localVideoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="flex-1 text-sm text-muted-foreground">
            Connected on voice call
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {inCall && clock && (
            <div className="text-xs text-muted-foreground tabular-nums px-2 py-1 bg-muted rounded">
              {clock}
            </div>
          )}
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
