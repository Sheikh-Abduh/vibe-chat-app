"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface CleanupDebugHelperProps {
  currentUser: any;
}

export default function CleanupDebugHelper({ currentUser }: CleanupDebugHelperProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingCleanup, setIsTestingCleanup] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const { toast } = useToast();

  const testFunctionConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    
    try {
      // Test if we can connect to Firebase Functions
      const testFunction = httpsCallable(functions, 'generateAgoraToken');
      await testFunction({ channelName: 'test', uid: 12345 });
      
      setConnectionResult('✅ Firebase Functions connection successful');
      toast({
        title: "Connection Test Passed",
        description: "Firebase Functions are accessible",
      });
    } catch (error: any) {
      console.error('Function connection test failed:', error);
      setConnectionResult(`❌ Connection failed: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Connection Test Failed",
        description: error.message,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testCleanupFunction = async () => {
    setIsTestingCleanup(true);
    setCleanupResult(null);
    
    try {
      // Test the cleanup stats function first (less invasive)
      const getCleanupStats = httpsCallable(functions, 'getCleanupStats');
      const result = await getCleanupStats();
      
      setCleanupResult('✅ Cleanup function accessible');
      console.log('Cleanup stats result:', result.data);
      
      toast({
        title: "Cleanup Function Test Passed",
        description: "Cleanup functions are working correctly",
      });
    } catch (error: any) {
      console.error('Cleanup function test failed:', error);
      
      let errorMessage = error.message;
      if (error.code === 'functions/not-found') {
        errorMessage = 'Cleanup functions not deployed. Please run: firebase deploy --only functions';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Permission denied. You may not have cleanup permissions.';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication required. Please make sure you are logged in.';
      }
      
      setCleanupResult(`❌ Cleanup test failed: ${errorMessage}`);
      toast({
        variant: "destructive",
        title: "Cleanup Function Test Failed",
        description: errorMessage,
      });
    } finally {
      setIsTestingCleanup(false);
    }
  };

  const testManualCleanup = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please make sure you are logged in",
      });
      return;
    }

    setIsTestingCleanup(true);
    setCleanupResult(null);
    
    try {
      const manualMessageCleanup = httpsCallable(functions, 'manualMessageCleanup');
      const result = await manualMessageCleanup();
      
      console.log('Manual cleanup result:', result.data);
      setCleanupResult('✅ Manual cleanup completed successfully');
      
      toast({
        title: "Manual Cleanup Successful",
        description: `Cleanup completed. Check console for details.`,
      });
    } catch (error: any) {
      console.error('Manual cleanup failed:', error);
      
      let errorMessage = error.message;
      let debugInfo = '';
      
      if (error.code === 'functions/not-found') {
        errorMessage = 'Cleanup functions not deployed';
        debugInfo = 'Run: firebase deploy --only functions';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'Permission denied';
        debugInfo = 'You may not have cleanup permissions';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication required';
        debugInfo = 'Please make sure you are logged in';
      } else if (error.code === 'functions/internal') {
        errorMessage = 'Internal server error';
        debugInfo = 'Check Firebase Functions logs for details';
      }
      
      setCleanupResult(`❌ Manual cleanup failed: ${errorMessage}`);
      
      toast({
        variant: "destructive",
        title: "Manual Cleanup Failed",
        description: `${errorMessage}. ${debugInfo}`,
      });
    } finally {
      setIsTestingCleanup(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Cleanup Debug Helper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Use this helper to diagnose issues with the message cleanup system.
        </div>
        
        {/* Connection Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">1. Test Firebase Functions Connection</span>
            <Button 
              onClick={testFunctionConnection}
              disabled={isTestingConnection}
              variant="outline"
              size="sm"
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>
          {connectionResult && (
            <div className="text-sm p-2 bg-muted rounded">
              {connectionResult}
            </div>
          )}
        </div>

        {/* Cleanup Function Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">2. Test Cleanup Functions</span>
            <Button 
              onClick={testCleanupFunction}
              disabled={isTestingCleanup}
              variant="outline"
              size="sm"
            >
              {isTestingCleanup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Test Cleanup'
              )}
            </Button>
          </div>
          {cleanupResult && (
            <div className="text-sm p-2 bg-muted rounded">
              {cleanupResult}
            </div>
          )}
        </div>

        {/* Manual Cleanup Test */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">3. Test Manual Cleanup (Actual)</span>
            <Button 
              onClick={testManualCleanup}
              disabled={isTestingCleanup || !currentUser}
              variant="outline"
              size="sm"
              className="text-amber-600 hover:text-amber-700"
            >
              {isTestingCleanup ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Run Manual Cleanup'
              )}
            </Button>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          <div className="font-medium mb-2">Debug Information:</div>
          <div className="space-y-1 text-muted-foreground">
            <div>User: {currentUser?.email || 'Not logged in'}</div>
            <div>User ID: {currentUser?.uid || 'N/A'}</div>
            <div>Functions Region: {functions.region || 'us-central1'}</div>
          </div>
        </div>

        {/* Common Solutions */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
          <div className="font-medium mb-2">Common Solutions:</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Functions not deployed:</strong> Run <code>firebase deploy --only functions</code></li>
            <li>• <strong>Permission denied:</strong> Make sure your email is sheikhabduh6@gmail.com or you have cleanup permissions</li>
            <li>• <strong>Authentication issues:</strong> Try logging out and back in</li>
            <li>• <strong>Internal errors:</strong> Check Firebase Functions logs in the console</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}