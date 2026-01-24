"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Settings, X, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CameraPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCall: (withVideo: boolean) => void;
  callType: "audio" | "video";
}

export default function CameraPreview({ isOpen, onClose, onStartCall, callType }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);
        
        // Set default devices
        const videoDevice = deviceList.find(d => d.kind === 'videoinput');
        const audioDevice = deviceList.find(d => d.kind === 'audioinput');
        
        if (videoDevice) setSelectedVideoDevice(videoDevice.deviceId);
        if (audioDevice) setSelectedAudioDevice(audioDevice.deviceId);
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    if (isOpen) {
      getDevices();
    }
  }, [isOpen]);

  // Start preview stream
  useEffect(() => {
    const startPreview = async () => {
      if (!isOpen) return;

      try {
        const constraints: MediaStreamConstraints = {
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          video: isVideoEnabled ? (
            selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
          ) : false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current && isVideoEnabled) {
          videoRef.current.srcObject = newStream;
        }
      } catch (error) {
        console.error('Error starting preview:', error);
      }
    };

    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isVideoEnabled, selectedVideoDevice, selectedAudioDevice]);

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleStartCall = () => {
    onStartCall(isVideoEnabled);
    onClose();
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onClose();
  };

  const videoDevices = devices.filter(d => d.kind === 'videoinput');
  const audioDevices = devices.filter(d => d.kind === 'audioinput');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Call Preview</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {isVideoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <VideoOff className="w-12 h-12 mx-auto mb-2" />
                  <p>Camera is off</p>
                </div>
              </div>
            )}
          </div>

          {/* Device Settings */}
          {showSettings && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">Camera</label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full p-2 rounded border bg-background"
                  disabled={!isVideoEnabled}
                >
                  {videoDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Microphone</label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full p-2 rounded border bg-background"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={isVideoEnabled ? "default" : "secondary"}
                size="sm"
                onClick={toggleVideo}
                className="gap-2"
              >
                {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                {isVideoEnabled ? "Video On" : "Video Off"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStartCall} className="gap-2">
                <Phone className="w-4 h-4" />
                Start {isVideoEnabled ? "Video" : "Audio"} Call
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}