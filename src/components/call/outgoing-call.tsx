"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, Phone, Video } from "lucide-react";

interface OutgoingCallProps {
  visible: boolean;
  calleeName?: string;
  onCancel: () => void;
}

export default function OutgoingCall({ visible, calleeName, onCancel }: OutgoingCallProps) {
  if (!visible) return null;
  return (
    <div className="w-full border-b border-border/40 bg-card/80 backdrop-blur-md">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-sm">
          Calling{calleeName ? ` ${calleeName}` : ''}...
        </div>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" className="gap-1" onClick={onCancel}>
            <PhoneOff className="h-4 w-4" /> Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
