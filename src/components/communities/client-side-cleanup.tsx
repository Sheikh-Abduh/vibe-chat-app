"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

interface ClientSideCleanupProps {
  currentUser: any;
  onCleanupComplete?: (result: any) => void;
}

export default function ClientSideCleanup({ currentUser, onCleanupComplete }: ClientSideCleanupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const performClientSideCleanup = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please make sure you are logged in",
      });
      return;
    }

    // Check if user has permission (basic check)
    if (currentUser.email !== 'sheikhabduh6@gmail.com') {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only the vibe community owner can perform cleanup",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const vibeCommunityId = 'vibe-community-main';
      const channelIds = [
        'vibe-general',
        'vibe-announcements',
        'vibe-passion-art-design',
        'vibe-passion-movies-tv',
        'vibe-passion-music',
        'vibe-passion-reading',
        'vibe-passion-technology',
        'vibe-passion-travel',
        'vibe-passion-gaming',
        'vibe-passion-sports-fitness',
        'vibe-passion-food-cooking',
        'vibe-passion-other-hobbies'
      ];

      let totalDeleted = 0;
      const channelStats: Record<string, number> = {};

      for (const channelId of channelIds) {
        try {
          const messagesRef = collection(db, `communities/${vibeCommunityId}/channels/${channelId}/messages`);
          const oldMessagesQuery = query(
            messagesRef,
            where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo)),
            orderBy('timestamp')
          );

          const snapshot = await getDocs(oldMessagesQuery);
          
          if (!snapshot.empty) {
            // Delete in batches of 500 (Firestore limit)
            const batches = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;

            snapshot.docs.forEach((doc) => {
              currentBatch.delete(doc.ref);
              operationCount++;

              if (operationCount === 500) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                operationCount = 0;
              }
            });

            if (operationCount > 0) {
              batches.push(currentBatch);
            }

            // Execute all batches
            for (const batch of batches) {
              await batch.commit();
            }

            channelStats[channelId] = snapshot.docs.length;
            totalDeleted += snapshot.docs.length;
          } else {
            channelStats[channelId] = 0;
          }
        } catch (error) {
          console.error(`Error cleaning up channel ${channelId}:`, error);
          channelStats[channelId] = -1; // Indicate error
        }
      }

      const result = {
        success: true,
        totalDeleted,
        channelStats,
        cutoffDate: thirtyDaysAgo.toISOString(),
        timestamp: new Date().toISOString(),
        method: 'client-side'
      };

      setLastResult(result);
      onCleanupComplete?.(result);

      toast({
        title: "Cleanup Completed",
        description: `Successfully deleted ${totalDeleted} old messages from the vibe community.`,
      });

    } catch (error: any) {
      console.error('Client-side cleanup failed:', error);
      
      const result = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        method: 'client-side'
      };

      setLastResult(result);

      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: error.message || "Could not complete message cleanup.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Client-Side Cleanup (Temporary)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Temporary Solution</p>
              <p className="text-amber-700 dark:text-amber-300">
                This is a client-side cleanup that works without Firebase Functions. 
                For the full solution with scheduled cleanup, upgrade to Blaze plan and deploy functions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={performClientSideCleanup}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isLoading ? 'Cleaning up...' : 'Run Client-Side Cleanup'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Delete messages older than 30 days (client-side)
          </p>
        </div>

        {lastResult && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Last Cleanup Result:</h4>
            <div className="text-sm space-y-1">
              <div>Status: {lastResult.success ? '✅ Success' : '❌ Failed'}</div>
              {lastResult.success && (
                <>
                  <div>Messages Deleted: {lastResult.totalDeleted}</div>
                  <div>Cutoff Date: {new Date(lastResult.cutoffDate).toLocaleDateString()}</div>
                </>
              )}
              {lastResult.error && (
                <div className="text-red-600">Error: {lastResult.error}</div>
              )}
              <div>Timestamp: {new Date(lastResult.timestamp).toLocaleString()}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}