"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MicOff, Mic, Video, VideoOff, PhoneOff } from "lucide-react";
import { Room } from "livekit-client";
import {
  LiveKitRoom,
  VideoConference,
  useRoomContext,
  useTracks,
  TrackReferenceOrPlaceholder,
  AudioTrack,
  VideoTrack,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveKitCallPanelProps {
  roomName: string;
  token: string;
  onDisconnect: () => void;
  callType: "audio" | "video";
}

function CallControls({ onDisconnect, callType }: { onDisconnect: () => void; callType: "audio" | "video" }) {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(callType === "video");

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(enabled);
    }
  }, [localParticipant]);

  const toggleCamera = useCallback(async () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!enabled);
      setIsCameraOn(!enabled);
    }
  }, [localParticipant]);

  return (
    <div className="flex items-center gap-2 p-4 bg-card/80 backdrop-blur-sm border-t">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <MicOff className="h-5 w-5 text-destructive" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      
      {callType === "video" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCamera}
          title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCameraOn ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      )}
      
      <Button
        variant="destructive"
        size="icon"
        onClick={onDisconnect}
        title="Hang up"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}

function CallView({ callType, onDisconnect }: { callType: "audio" | "video"; onDisconnect: () => void }) {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  if (callType === "video") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 relative bg-black">
          <VideoConference />
        </div>
        <CallControls onDisconnect={onDisconnect} callType={callType} />
      </div>
    );
  }

  // Audio-only call
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center bg-card/30">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Voice Call</div>
          <div className="text-sm text-muted-foreground">
            {remoteParticipants.length > 0 ? "Connected" : "Connecting..."}
          </div>
        </div>
      </div>
      <CallControls onDisconnect={onDisconnect} callType={callType} />
    </div>
  );
}

export default function LiveKitCallPanel({ roomName, token, onDisconnect, callType }: LiveKitCallPanelProps) {
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden">
      <LiveKitRoom
        video={callType === "video"}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: "100%" }}
        onDisconnected={onDisconnect}
      >
        <CallView callType={callType} onDisconnect={onDisconnect} />
      </LiveKitRoom>
    </div>
  );
}