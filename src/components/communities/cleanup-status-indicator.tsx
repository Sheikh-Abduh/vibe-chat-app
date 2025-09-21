"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanupStatusIndicatorProps {
  communityId: string;
  className?: string;
}

export default function CleanupStatusIndicator({ communityId, className }: CleanupStatusIndicatorProps) {
  // Only show for vibe community
  if (communityId !== 'vibe-community-main') {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
            className
          )}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Auto-cleanup
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium mb-1">Message Auto-cleanup Active</p>
          <p className="text-muted-foreground">
            Messages older than 30 days are automatically deleted daily
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}