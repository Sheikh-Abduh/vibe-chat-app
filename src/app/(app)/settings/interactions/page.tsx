"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, UserX, Loader2, MessageSquareOff, MessageSquare, Shield } from 'lucide-react';
import InteractionTester from '@/components/debug/interaction-tester';
import { isUserDeleted, logFilteringStats } from '@/lib/user-filtering';


interface ConnectedUser {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  connectedAt: Date;
}

interface BlockedUser {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  blockedAt: Date;
}

export default function InteractionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadInteractions(user);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadInteractions = async (user: User) => {
    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      // Load connected users
      await loadConnectedUsers(user);
      
      // Load blocked users (includes both blocked and disconnected)
      const blockedUserIds = userData?.blockedUsers || [];
      const disconnectedUserIds = userData?.disconnectedUsers || [];
      const allBlockedUserIds = [...new Set([...blockedUserIds, ...disconnectedUserIds])]; // Merge and deduplicate
      
      const blockedUsersData: BlockedUser[] = [];
      let originalBlockedCount = 0;
      
      for (const userId of allBlockedUserIds) {
        originalBlockedCount++;
        try {
          const blockedUserDoc = await getDoc(doc(db, 'users', userId));
          if (blockedUserDoc.exists()) {
            const data = blockedUserDoc.data();
            
            // Filter out deleted users
            if (isUserDeleted(data)) {
              console.log(`Skipping deleted blocked user ${userId}`);
              continue;
            }
            
            blockedUsersData.push({
              userId,
              displayName: data.displayName || data.email?.split('@')[0] || 'Unknown User',
              email: data.email || '',
              photoURL: data.photoURL,
              blockedAt: new Date() // You might want to store actual block timestamp
            });
          }
        } catch (error) {
          console.error('Error fetching blocked user:', error);
        }
      }
      
      logFilteringStats(originalBlockedCount, blockedUsersData.length, "interactions-blocked");
      
      setBlockedUsers(blockedUsersData);
    } catch (error) {
      console.error('Error loading interactions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load interactions"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnectedUsers = async (user: User) => {
    try {
      // Get current user's blocked and disconnected lists first
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const blockedUserIds = new Set(userData?.blockedUsers || []);
      const disconnectedUserIds = new Set(userData?.disconnectedUsers || []);
      const allBlockedUserIds = new Set([...blockedUserIds, ...disconnectedUserIds]);

      // Get all connection requests where the current user is involved and status is 'accepted'
      const requestsRef = collection(db, 'connectionRequests');
      const q1 = query(
        requestsRef,
        where('status', '==', 'accepted'),
        where('fromUserId', '==', user.uid)
      );
      const q2 = query(
        requestsRef,
        where('status', '==', 'accepted'),
        where('toUserId', '==', user.uid)
      );
      
      const [fromSnapshot, toSnapshot] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const connectedUserIds = new Set<string>();
      
      fromSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only add if not blocked or disconnected
        if (!allBlockedUserIds.has(data.toUserId)) {
          connectedUserIds.add(data.toUserId);
        }
      });
      
      toSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only add if not blocked or disconnected
        if (!allBlockedUserIds.has(data.fromUserId)) {
          connectedUserIds.add(data.fromUserId);
        }
      });

      const connectedUsersData: ConnectedUser[] = [];
      let originalCount = 0;
      
      for (const userId of connectedUserIds) {
        originalCount++;
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Filter out deleted users
            if (isUserDeleted(data)) {
              console.log(`Skipping deleted connected user ${userId}`);
              continue;
            }
            
            connectedUsersData.push({
              userId,
              displayName: data.displayName || data.email?.split('@')[0] || 'Unknown User',
              email: data.email || '',
              photoURL: data.photoURL,
              connectedAt: new Date() // You might want to store actual connection timestamp
            });
          }
        } catch (error) {
          console.error('Error fetching connected user:', error);
        }
      }
      
      logFilteringStats(originalCount, connectedUsersData.length, "interactions-connected");
      
      setConnectedUsers(connectedUsersData);
    } catch (error) {
      console.error('Error loading connected users:', error);
    }
  };

  const blockUser = async (userId: string, displayName: string) => {
    if (!currentUser) return;

    try {
      // Find the user before making any state changes
      const userToDisconnect = connectedUsers.find(user => user.userId === userId);
      if (!userToDisconnect) return;

      // Add to both blocked and disconnected users lists to ensure complete blocking
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: arrayUnion(userId),
        disconnectedUsers: arrayUnion(userId)
      });

      // Also add current user to the other user's blocked and disconnected lists
      await updateDoc(doc(db, 'users', userId), {
        blockedUsers: arrayUnion(currentUser.uid),
        disconnectedUsers: arrayUnion(currentUser.uid)
      });

      // Update state atomically
      setConnectedUsers(prev => prev.filter(user => user.userId !== userId));
      setBlockedUsers(prev => [...prev, {
        ...userToDisconnect,
        blockedAt: new Date()
      }]);

      toast({
        title: "User Blocked",
        description: `${displayName} has been blocked. You cannot interact with them anywhere.`
      });

      // Dispatch event to notify other components after a small delay to ensure DB changes propagate
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('interactionStatusChanged', {
          detail: { userId, action: 'blocked' }
        }));
      }, 100);
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to block user"
      });
    }
  };

  const unblockUser = async (userId: string, displayName: string) => {
    if (!currentUser) return;

    console.log(`Unblocking user ${userId} (${displayName})`);

    try {
      // Find the user before making any state changes
      const userToUnblock = blockedUsers.find(user => user.userId === userId);
      if (!userToUnblock) {
        console.error('User to unblock not found in blocked list');
        return;
      }

      // Remove from both blocked and disconnected users lists
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: arrayRemove(userId),
        disconnectedUsers: arrayRemove(userId)
      });

      // Also remove current user from the other user's blocked and disconnected lists
      await updateDoc(doc(db, 'users', userId), {
        blockedUsers: arrayRemove(currentUser.uid),
        disconnectedUsers: arrayRemove(currentUser.uid)
      });

      // Update state atomically
      setBlockedUsers(prev => prev.filter(user => user.userId !== userId));
      setConnectedUsers(prev => [...prev, {
        ...userToUnblock,
        connectedAt: new Date()
      }]);

      console.log(`Successfully unblocked user ${userId}. Updated state.`);

      toast({
        title: "User Unblocked",
        description: `${displayName} has been unblocked. You can now message and call them directly.`
      });

      // Dispatch event to notify other components after a small delay to ensure DB changes propagate
      setTimeout(() => {
        console.log(`Dispatching interactionStatusChanged event: unblocked for user ${userId}`);
        window.dispatchEvent(new CustomEvent('interactionStatusChanged', {
          detail: { userId, action: 'unblocked' }
        }));
      }, 100);
    } catch (error) {
      console.error('Error reconnecting user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reconnect user"
      });
    }
  };

  if (isCheckingAuth) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Interactions
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentUser && loadInteractions(currentUser)}
              disabled={isLoading}
              className="ml-auto"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your connections and interactions. Blocked users cannot interact with you anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connected" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connected" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Connected ({connectedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="blocked" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Blocked ({blockedUsers.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="connected" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading connected users...</span>
                </div>
              ) : connectedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No connected users</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect with users to start messaging and calling them directly
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connectedUsers.map((user) => (
                    <div key={`connected-${user.userId}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL} alt={user.displayName} />
                          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            Connected
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => blockUser(user.userId, user.displayName)}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Block
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="blocked" className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading blocked users...</span>
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No blocked users</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Users you block will appear here and cannot interact with you anywhere
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blockedUsers.map((user) => (
                    <div key={`blocked-${user.userId}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL} alt={user.displayName} />
                          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <Badge variant="outline" className="text-xs mt-1 border-red-500 text-red-600">
                            Blocked
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-600 hover:bg-green-600/10"
                        onClick={() => unblockUser(user.userId, user.displayName)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {process.env.NODE_ENV === 'development' && (
        <InteractionTester />
      )}
    </div>
  );
}