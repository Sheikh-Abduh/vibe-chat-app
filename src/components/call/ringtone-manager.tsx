"use client";

import { useEffect, useRef } from "react";

interface RingtoneManagerProps {
  isRinging: boolean;
  type: "incoming" | "outgoing";
}

export default function RingtoneManager({ isRinging, type }: RingtoneManagerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRinging) {
      startRingtone();
    } else {
      stopRingtone();
    }

    return () => stopRingtone();
  }, [isRinging, type]);

  const startRingtone = async () => {
    try {
      if (type === "incoming") {
        // Use custom ringtone.mp3 for incoming calls
        const audio = new Audio('/sounds/ringtone.mp3');
        audio.loop = true;
        audio.volume = 0.6; // Higher volume for incoming calls
        
        try {
          audioElementRef.current = audio; // Store reference for cleanup
          await audio.play();
          console.log('Playing custom ringtone.mp3 for incoming call');
          return; // If successful, don't use Web Audio fallback
        } catch (e) {
          console.log('Could not play custom ringtone, using Web Audio fallback');
          audioElementRef.current = null;
          // Fall back to Web Audio API if file doesn't exist or can't play
        }
      } else {
        // For outgoing calls, use a different tone or the same file with different settings
        const audio = new Audio('/sounds/ringtone.mp3');
        audio.loop = true;
        audio.volume = 0.4; // Lower volume for outgoing calls
        audio.playbackRate = 1.2; // Slightly faster for outgoing
        
        try {
          audioElementRef.current = audio; // Store reference for cleanup
          await audio.play();
          console.log('Playing custom ringtone.mp3 for outgoing call');
          return;
        } catch (e) {
          console.log('Could not play outgoing ringtone, using Web Audio fallback');
          audioElementRef.current = null;
        }
      }
    } catch (e) {
      // Continue to Web Audio fallback
    }

    // Web Audio API fallback for ringtone generation
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      if (type === "incoming") {
        // Incoming call: Classic phone ring pattern
        createIncomingRingtone(audioContext);
      } else {
        // Outgoing call: Simple beep pattern
        createOutgoingRingtone(audioContext);
      }
    } catch (error) {
      console.warn("Could not create ringtone:", error);
    }
  };

  const createIncomingRingtone = (audioContext: AudioContext) => {
    let isPlaying = false;
    
    const playRingTone = () => {
      if (isPlaying) return;
      isPlaying = true;

      // Create a more pleasant ringtone with multiple frequencies
      const frequencies = [800, 1000]; // A5 and C6
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];

      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.value = freq;
        gain.gain.value = 0.1 / frequencies.length; // Distribute volume
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillators.push(oscillator);
        gains.push(gain);
        
        oscillator.start();
      });

      // Ring pattern: 2 seconds on, 4 seconds off
      setTimeout(() => {
        oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
        isPlaying = false;
      }, 2000);
    };

    // Start immediately and repeat every 6 seconds
    playRingTone();
    intervalRef.current = setInterval(playRingTone, 6000);
  };

  const createOutgoingRingtone = (audioContext: AudioContext) => {
    let beepCount = 0;
    
    const playBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = 440; // A4
      gain.gain.value = 0.05;
      
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      
      oscillator.start();
      
      // Short beep: 200ms
      setTimeout(() => {
        try { oscillator.stop(); } catch {}
      }, 200);
    };

    // Beep pattern: beep every 3 seconds
    playBeep();
    intervalRef.current = setInterval(playBeep, 3000);
  };

  const stopRingtone = () => {
    console.log('Stopping ringtone...');
    
    // Stop audio element if playing
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current = null;
        console.log('Audio element stopped');
      } catch (e) {
        console.error('Error stopping audio element:', e);
      }
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop Web Audio oscillator
    if (oscillatorRef.current) {
      try { 
        oscillatorRef.current.stop(); 
        console.log('Web Audio oscillator stopped');
      } catch {}
      oscillatorRef.current = null;
    }

    // Disconnect gain node
    if (gainRef.current) {
      try {
        gainRef.current.disconnect();
      } catch {}
      gainRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  return null; // This component doesn't render anything
}