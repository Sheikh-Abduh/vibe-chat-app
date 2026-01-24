"use client";

import { useEffect, useRef } from "react";

interface GlobalRingtoneManagerProps {
  isIncomingCall: boolean;
  isOutgoingCall: boolean;
}

export default function GlobalRingtoneManager({ isIncomingCall, isOutgoingCall }: GlobalRingtoneManagerProps) {
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const outgoingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming call ringtone
  useEffect(() => {
    console.log('🎵 [RingtoneManager] Incoming call state changed:', isIncomingCall);

    const handleStopRingtone = () => {
      stopIncomingRingtone();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('stopRingtone', handleStopRingtone);
    }
    
    if (isIncomingCall) {
      console.log('🔔 [RingtoneManager] Starting incoming call ringtone');
      
      // Create new Audio element for each call to avoid stale state
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      incomingAudioRef.current = audio;

      // Request audio permission if needed
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            // Permission granted, play ringtone
            return audio.play();
          })
          .then(() => {
            console.log('✅ [RingtoneManager] Ringtone playing');
          })
          .catch(error => {
            console.error('❌ [RingtoneManager] Audio error:', error);
          });
      } else {
        // Fallback for browsers without mediaDevices
        audio.play()
          .then(() => {
            console.log('✅ [RingtoneManager] Ringtone playing (fallback)');
          })
          .catch(error => {
            console.error('❌ [RingtoneManager] Audio error (fallback):', error);
          });
      }
      
      console.log('🎵 Started incoming ringtone');
    } else {
      stopIncomingRingtone();
      console.log('🔇 Stopped incoming ringtone');
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('stopRingtone', handleStopRingtone);
      }
      stopIncomingRingtone();
    };
  }, [isIncomingCall]);

  // Handle outgoing call ringtone
  useEffect(() => {
    if (isOutgoingCall) {
      startOutgoingRingtone();
    } else {
      stopOutgoingRingtone();
    }

    return () => stopOutgoingRingtone();
  }, [isOutgoingCall]);

  const startIncomingRingtone = async () => {
    try {
      // Stop any existing ringtone first
      stopIncomingRingtone();
      
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.6;
      incomingAudioRef.current = audio;
      
      await audio.play();
    } catch (error) {
      // Fallback to Web Audio API
      createIncomingWebAudioRingtone();
    }
  };

  const startOutgoingRingtone = async () => {
    try {
      // Stop any existing ringtone first
      stopOutgoingRingtone();
      
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.4;
      audio.playbackRate = 1.2; // Slightly faster for outgoing
      outgoingAudioRef.current = audio;
      
      await audio.play();
    } catch (error) {
      // Fallback to Web Audio API
      createOutgoingWebAudioRingtone();
    }
  };

  const stopIncomingRingtone = () => {
    if (incomingAudioRef.current) {
      try {
        incomingAudioRef.current.pause();
        incomingAudioRef.current.currentTime = 0;
        incomingAudioRef.current = null;
      } catch (error) {
        console.error('Error stopping incoming audio:', error);
      }
    }

    if (incomingIntervalRef.current) {
      clearInterval(incomingIntervalRef.current);
      incomingIntervalRef.current = null;
    }
  };

  const stopOutgoingRingtone = () => {
    if (outgoingAudioRef.current) {
      try {
        outgoingAudioRef.current.pause();
        outgoingAudioRef.current.currentTime = 0;
        outgoingAudioRef.current = null;
      } catch (error) {
        console.error('Error stopping outgoing audio:', error);
      }
    }

    if (outgoingIntervalRef.current) {
      clearInterval(outgoingIntervalRef.current);
      outgoingIntervalRef.current = null;
    }
  };

  const createIncomingWebAudioRingtone = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = () => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.value = 800;
        gain.gain.value = 0.1;
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        setTimeout(() => {
          try { oscillator.stop(); } catch {}
        }, 1000);
      };

      playTone();
      incomingIntervalRef.current = setInterval(playTone, 3000);
    } catch (error) {
      console.error('❌ Error creating Web Audio ringtone:', error);
    }
  };

  const createOutgoingWebAudioRingtone = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        oscillator.type = "sine";
        oscillator.frequency.value = 440;
        gain.gain.value = 0.05;
        
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        
        oscillator.start();
        setTimeout(() => {
          try { oscillator.stop(); } catch {}
        }, 200);
      };

      playBeep();
      outgoingIntervalRef.current = setInterval(playBeep, 2000);
    } catch (error) {
      console.error('❌ Error creating Web Audio beep:', error);
    }
  };

  // This component doesn't render anything
  return null;
}