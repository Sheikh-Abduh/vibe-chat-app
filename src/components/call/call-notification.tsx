"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CallNotificationProps {
  visible: boolean;
  callerName?: string;
  callerAvatar?: string;
  callType: "incoming" | "outgoing";
  onAccept?: () => void;
  onDecline?: () => void;
  onAcceptVideo?: () => void;
  onCancel?: () => void;
  onDismiss: () => void;
}

export default function CallNotification({
  visible,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline,
  onAcceptVideo,
  onCancel,
  onDismiss,
}: CallNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Auto-dismiss after 10 seconds if not interacted with
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-40 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback>
                {callerName ? callerName.charAt(0).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-medium text-sm">
                {callerName || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">
                {callType === 'incoming' ? 'Incoming call...' : 'Calling...'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 300);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {callType === 'incoming' ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-1"
                onClick={onDecline}
              >
                <PhoneOff className="w-3 h-3" />
                Decline
              </Button>
              
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
                onClick={onAccept}
              >
                <Phone className="w-3 h-3" />
                Accept
              </Button>

              {onAcceptVideo && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={onAcceptVideo}
                  title="Accept with video"
                >
                  <Video className="w-3 h-3" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1"
              onClick={onCancel}
            >
              <PhoneOff className="w-3 h-3" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}