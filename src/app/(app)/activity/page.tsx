
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BellDot, MessageSquareReply, AtSign, ArrowLeft, Users, Heart, Loader2 } from 'lucide-react';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';

// Defines the structure of an activity item fetched from Firestore
interface ActivityItem {
  id: string;
  type: 'mention' | 'reply' | 'reaction' | 'community_join' | 'new_follower' | 'system_message'; // Added more types
  actorId?: string; // UID of the user who performed the action
  actorName?: string; // Name of the user who performed the action
  actorAvatarUrl?: string; // Avatar of the user who performed the action
  dataAiHint?: string; // For actor's avatar
  contentSnippet: string; // Main text of the activity item, e.g., "mentioned you in #general" or "replied to your message"
  targetLink?: string; // Deep link to the content (e.g., message, profile, community)
  timestamp: Date;
  isRead?: boolean; // To mark as read/unread
  communityId?: string;
  channelId?: string;
  messageId?: string;
  targetUserId?: string; // For follow actions, etc.
}


export default function ActivityPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      setIsLoadingActivities(true);
      // Listen to a subcollection under the user's document, e.g., users/{uid}/activityItems
      // The actual generation of these documents is a backend task (e.g., Cloud Functions).
      const activityItemsRef = collection(db, `users/${currentUser.uid}/activityItems`);
      const q = query(activityItemsRef, orderBy('timestamp', 'desc'), limit(50)); // Get latest 50

      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const fetchedActivities: ActivityItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedActivities.push({
            id: doc.id,
            type: data.type,
            actorId: data.actorId,
            actorName: data.actorName,
            actorAvatarUrl: data.actorAvatarUrl,
            dataAiHint: data.dataAiHint || 'person face',
            contentSnippet: data.contentSnippet,
            targetLink: data.targetLink,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            isRead: data.isRead || false,
            communityId: data.communityId,
            channelId: data.channelId,
            messageId: data.messageId,
            targetUserId: data.targetUserId,
          } as ActivityItem);
        });
        setActivities(fetchedActivities);
        setIsLoadingActivities(false);
      }, (error) => {
        console.error("Error fetching activity items: ", error);
        setActivities([]);
        setIsLoadingActivities(false);
        // Optionally show a toast message for error
      });

      return () => unsubscribeFirestore();
    }
  }, [currentUser]);

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  const renderIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-5 w-5 text-primary" />;
      case 'reply':
        return <MessageSquareReply className="h-5 w-5 text-accent" />;
      case 'reaction':
        return <Heart className="h-5 w-5 text-red-500" />; // Example, can be dynamic based on reaction
      case 'community_join':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'new_follower':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'system_message':
        return <BellDot className="h-5 w-5 text-yellow-500" />;
      default:
        return <BellDot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const ActivityItemDisplay: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
    const content = (
      <div className="flex items-start space-x-3">
        <Avatar className="h-10 w-10 mt-0.5">
          <AvatarImage src={activity.actorAvatarUrl || `https://placehold.co/40x40.png?text=${(activity.actorName || 'V').charAt(0)}`} alt={activity.actorName || 'System'} data-ai-hint={activity.dataAiHint} />
          <AvatarFallback>{(activity.actorName || 'V').substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm text-foreground">
            {activity.actorName && <span className="font-semibold">{activity.actorName}</span>} {activity.contentSnippet}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(activity.timestamp, { addSuffix: true })}
          </p>
        </div>
        <div className="shrink-0">
          {renderIcon(activity.type)}
        </div>
      </div>
    );

    if (activity.targetLink) {
      return (
        <Link 
          href={activity.targetLink}
          className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30"
        >
          {content}
        </Link>
      );
    }

    return (
      <div className="block p-3 rounded-lg border border-border/30">
        {content}
      </div>
    );
  };


  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6 flex flex-col">
      <div className="flex items-center mb-6 shrink-0">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <BellDot className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Activity Feed
        </h1>
      </div>

      <Card className="w-full flex-1 flex flex-col bg-card border-border/50 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Stay updated with mentions, replies, and other important events.
            <br />
            <span className="text-xs italic">(Note: Generation of these notifications is a backend task and is not yet fully implemented.)</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isLoadingActivities ? (
             <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2"/> Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No new activity. Your feed is clear!
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {activities.map((activity) => (
                  <ActivityItemDisplay key={activity.id} activity={activity} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

