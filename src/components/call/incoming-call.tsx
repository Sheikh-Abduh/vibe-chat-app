"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IncomingCallProps {
  visible: boolean;
  callerName?: string;
  callerAvatar?: string;
  onAccept: () => void;
  onDecline: () => void;
  onAcceptVideo?: () => void;
}

export default function IncomingCall({
  visible,
  callerName,
  callerAvatar,
  onAccept,
  onDecline,
  onAcceptVideo
}: IncomingCallProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('📞 [IncomingCall] Component props updated:', { visible, callerName, callerAvatar });
  }, [visible, callerName, callerAvatar]);

  useEffect(() => {
    if (visible) {
      console.log('📞 [IncomingCall] Popup becoming visible');
      setIsVisible(true);
      // Delay animation to ensure DOM is ready
      setTimeout(() => {
        setIsAnimating(true);
      }, 10);

      // Request notification permission if not granted
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('🔔 [IncomingCall] Notification permission:', permission);
        });
      }

      // Show browser notification (ONLY ONCE)
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification('Incoming Call', {
            body: `${callerName || 'Someone'} is calling you`,
            icon: callerAvatar || '/logo.png',
            tag: 'incoming-call', // This prevents duplicate notifications with same tag
            requireInteraction: true,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Auto-close notification after 30 seconds
          setTimeout(() => {
            if (notification) notification.close();
          }, 30000);
        } catch (error) {
          console.error('Failed to show notification:', error);
        }
      }
    } else {
      console.log('📞 [IncomingCall] Popup becoming hidden');
      setIsAnimating(false);
      // Delay hiding to allow animation to complete
      setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }
  }, [visible, callerName, callerAvatar]);

  if (!visible) return null;

  return (
    <div className="w-full border-b border-border/40 bg-card/90 backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-primary animate-pulse">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback>{callerName ? callerName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></span>
          </div>

          <div>
            <div className="text-sm font-bold">
              {callerName || 'Unknown User'}
            </div>
            <div className="text-xs text-primary animate-pulse font-medium">
              Incoming Call...
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            className="h-9 w-9 rounded-full hover:scale-110 transition-transform shadow-lg shadow-destructive/20"
            onClick={onDecline}
            title="Decline"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 rounded-full hover:scale-110 transition-transform bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            onClick={onAccept}
            title="Accept Audio"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-full hover:scale-110 transition-transform bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={onAcceptVideo}
            title="Accept Video"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}