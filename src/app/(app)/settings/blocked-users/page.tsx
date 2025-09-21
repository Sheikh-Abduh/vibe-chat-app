"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Shield, UserX, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface BlockedUser {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  blockedAt: Date;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadBlockedUsers(user);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadBlockedUsers = async (user: User) => {
    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const blockedUserIds = userData?.blockedUsers || [];

      if (blockedUserIds.length === 0) {
        setBlockedUsers([]);
        return;
      }

      const blockedUsersData: BlockedUser[] = [];
      for (const userId of blockedUserIds) {
        try {
          const blockedUserDoc = await getDoc(doc(db, 'users', userId));
          if (blockedUserDoc.exists()) {
            const data = blockedUserDoc.data();
            blockedUsersData.push({
              userId,
              displayName: data.displayName || data.email?.split('@')[0] || 'Unknown User',
              email: data.email || '',
              photoURL: data.photoURL,
              blockedAt: new Date()
            });
          }
        } catch (error) {
          console.error('Error fetching blocked user:', error);
        }
      }

      setBlockedUsers(blockedUsersData);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load blocked users"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unblockUser = async (userId: string, displayName: string) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        blockedUsers: arrayRemove(userId)
      });

      setBlockedUsers(prev => prev.filter(user => user.userId !== userId));

      toast({
        title: "User Unblocked",
        description: `${displayName} has been unblocked`
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unblock user"
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
          <CardTitle>Blocked Users</CardTitle>
          <CardDescription>
            Manage your blocked users. When you block someone, they can't message you or call you anywhere, including community channels.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Note: This is different from disconnecting, which only prevents direct messages but allows community interaction.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                Users you block won't be able to message or call you directly
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {blockedUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL} alt={user.displayName} />
                      <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => unblockUser(user.userId, user.displayName)}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
