"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Clock, AlertTriangle, CheckCircle, Loader2, BarChart3, Bug } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { format } from 'date-fns';
import CleanupDebugHelper from './cleanup-debug-helper';
import ClientSideCleanup from './client-side-cleanup';

interface CleanupResult {
  success: boolean;
  totalDeleted: number;
  channelStats: Record<string, number | { error: string }>;
  cutoffDate: string;
  timestamp: string;
}

interface CleanupLog {
  id: string;
  type: string;
  action: string;
  result: CleanupResult;
  timestamp: string;
}

interface MessageCleanupManagerProps {
  isVisible: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function MessageCleanupManager({ isVisible, onClose, currentUser }: MessageCleanupManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupHistory, setCleanupHistory] = useState<CleanupLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showDebugHelper, setShowDebugHelper] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  // Load cleanup history when component becomes visible
  useEffect(() => {
    if (isVisible && currentUser) {
      loadCleanupHistory();
    }
  }, [isVisible, currentUser]);

  const loadCleanupHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const getCleanupStats = httpsCallable(functions, 'getCleanupStats');
      const result = await getCleanupStats();
      
      if (result.data && (result.data as any).success) {
        setCleanupHistory((result.data as any).cleanupHistory || []);
      }
    } catch (error) {
      console.error('Error loading cleanup history:', error);
      setHasError(true);
      toast({
        variant: "destructive",
        title: "Error Loading History",
        description: "Could not load cleanup history. You may not have permission to view this data.",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleManualCleanup = async () => {
    setIsLoading(true);
    try {
      const manualMessageCleanup = httpsCallable(functions, 'manualMessageCleanup');
      const result = await manualMessageCleanup();
      
      if (result.data && (result.data as any).success) {
        const cleanupResult = result.data as CleanupResult;
        
        toast({
          title: "Cleanup Completed",
          description: `Successfully deleted ${cleanupResult.totalDeleted} old messages from the vibe community.`,
        });
        
        // Refresh history
        await loadCleanupHistory();
      }
    } catch (error: any) {
      console.error('Error during manual cleanup:', error);
      setHasError(true);
      
      let errorMessage = error.message || "Could not complete message cleanup.";
      let description = "You may not have permission to perform this action.";
      
      if (error.code === 'functions/not-found') {
        errorMessage = "Cleanup Functions Not Deployed";
        description = "The cleanup functions haven't been deployed yet. Please deploy them first.";
      } else if (error.code === 'functions/internal') {
        errorMessage = "Internal Server Error";
        description = "There was an internal error. Check the debug helper below for more details.";
      }
      
      toast({
        variant: "destructive",
        title: errorMessage,
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Message Cleanup Manager
              </CardTitle>
              <CardDescription>
                Manage automatic deletion of messages older than 30 days in the vibe community
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Cleanup Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-medium mb-2">Automatic Cleanup Schedule</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Messages older than 30 days are automatically deleted daily at 2:00 AM UTC to keep the community fresh and manage storage.
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Next cleanup: Tomorrow at 2:00 AM UTC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Cleanup */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Manual Cleanup
            </h3>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleManualCleanup}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isLoading ? 'Cleaning up...' : 'Run Cleanup Now'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Manually trigger cleanup of messages older than 30 days
              </p>
            </div>
            
            {hasError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      Cleanup Error Detected
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugHelper(!showDebugHelper)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Bug className="h-4 w-4 mr-1" />
                    {showDebugHelper ? 'Hide' : 'Show'} Debug Helper
                  </Button>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Use the debug helper to diagnose and fix the issue.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Cleanup History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Cleanup History
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadCleanupHistory}
                disabled={isLoadingHistory}
              >
                {isLoadingHistory ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : cleanupHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No cleanup history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cleanupHistory.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {log.result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            {log.result.success ? 'Successful Cleanup' : 'Failed Cleanup'}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {log.action === 'vibe_community_cleanup' ? 'Vibe Community' : log.action}
                          </Badge>
                        </div>
                        
                        {log.result.success && (
                          <div className="text-sm text-muted-foreground mb-2">
                            <p>Deleted {log.result.totalDeleted} messages older than {format(new Date(log.result.cutoffDate), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      
                      {log.result.success && (
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {log.result.totalDeleted}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            messages deleted
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Channel breakdown */}
                    {log.result.success && log.result.channelStats && (
                      <details className="mt-3">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View channel breakdown
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(log.result.channelStats).map(([channel, count]) => (
                            <div key={channel} className="flex justify-between">
                              <span className="truncate">#{channel.replace('vibe-', '').replace('passion-', '')}</span>
                              <span>{typeof count === 'number' ? count : 'Error'}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Debug Helper */}
          {showDebugHelper && (
            <div className="mt-6 space-y-4">
              <CleanupDebugHelper currentUser={currentUser} />
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Temporary Solution</h3>
                <ClientSideCleanup 
                  currentUser={currentUser}
                  onCleanupComplete={(result) => {
                    if (result.success) {
                      // Refresh history after successful cleanup
                      loadCleanupHistory();
                    }
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}