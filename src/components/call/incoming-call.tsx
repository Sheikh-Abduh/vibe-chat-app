"use client";

import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallProps {
  visible: boolean;
  callerName?: string;
  onAccept: () => void;
  onDecline: () => void;
  onAcceptVideo?: () => void;
}

export default function IncomingCall({ visible, callerName, onAccept, onDecline, onAcceptVideo }: IncomingCallProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (visible) {
      try {
        // Try to play ringtone asset first (if exists)
        const el = new Audio("/sounds/ringtone.mp3");
        el.loop = true;
        el.volume = 0.25;
        audioElRef.current = el;
        el.play().then(() => {
          // Played asset successfully, no need for Web Audio fallback
        }).catch(() => {
          // Create simple ringtone using Web Audio API (beeping) as fallback
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880; // A5
          gain.gain.value = 0.0001; // start silent
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();

          audioCtxRef.current = ctx;
          oscRef.current = osc;
          gainRef.current = gain;

          // Beep pattern: 800ms on, 800ms off
          let on = false;
          const interval = setInterval(() => {
            on = !on;
            if (gainRef.current) {
              gainRef.current.gain.setTargetAtTime(on ? 0.03 : 0.0001, ctx.currentTime, 0.01);
            }
          }, 800);

          return () => {
            clearInterval(interval);
            try { osc.stop(); } catch {}
            gain.disconnect();
            osc.disconnect();
            ctx.close();
            audioCtxRef.current = null;
            oscRef.current = null;
            gainRef.current = null;
          };
        });
      } catch (e) {
        // Ignore audio errors (autoplay restrictions, etc.)
      }
    }
    return () => {
      try {
        if (audioElRef.current) {
          audioElRef.current.pause();
          audioElRef.current.currentTime = 0;
          audioElRef.current = null;
        }
      } catch {}
      if (audioCtxRef.current) {
        try { oscRef.current?.stop(); } catch {}
        gainRef.current?.disconnect();
        oscRef.current?.disconnect();
        audioCtxRef.current?.close();
      }
      audioCtxRef.current = null;
      oscRef.current = null;
      gainRef.current = null;
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="w-full border-b border-border/40 bg-card/80 backdrop-blur-md">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-sm">
          Incoming call{callerName ? ` from ${callerName}` : ''}...
        </div>
        <div className="flex items-center gap-2">
          {onAcceptVideo && (
            <Button variant="secondary" size="sm" className="gap-1" onClick={onAcceptVideo}>
              <Video className="h-4 w-4" /> Accept with Video
            </Button>
          )}
          <Button variant="default" size="sm" className="gap-1" onClick={onAccept}>
            <Phone className="h-4 w-4" /> Accept
          </Button>
          <Button variant="destructive" size="sm" className="gap-1" onClick={onDecline}>
            <PhoneOff className="h-4 w-4" /> Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
