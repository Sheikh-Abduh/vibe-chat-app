"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OutgoingCallProps {
  visible: boolean;
  calleeName?: string;
  calleeAvatar?: string;
  onCancel: () => void;
}

export default function OutgoingCall({ visible, calleeName, calleeAvatar, onCancel }: OutgoingCallProps) {
  if (!visible) return null;

  return (
    <div className="w-full border-b border-border/40 bg-card/80 backdrop-blur-md">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={calleeAvatar} alt={calleeName} />
            <AvatarFallback className="text-xs">
              {calleeName ? calleeName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className="text-sm font-medium">
              Calling {calleeName || 'Unknown'}...
            </div>
            <div className="text-xs text-muted-foreground">
              Connecting...
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="gap-1 hover:scale-105 transition-transform"
          onClick={onCancel}
        >
          <PhoneOff className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
