
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, Timestamp, limit, doc, writeBatch, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BellDot, MessageSquareReply, AtSign, ArrowLeft, Users, Heart, Loader2, UserPlus } from 'lucide-react'; // Added UserPlus
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { formatDistanceToNowStrict } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Defines the structure of an activity item fetched from Firestore
interface ActivityItem {
  id: string;
  type: 'mention' | 'reply' | 'reaction' | 'community_join' | 'new_follower' | 'system_message';
  actorId?: string; 
  actorName?: string; 
  actorAvatarUrl?: string; 
  dataAiHint?: string; 
  contentSnippet: string; 
  targetLink?: string; 
  timestamp: Date;
  isRead?: boolean; 
  communityId?: string;
  channelId?: string;
  messageId?: string;
  targetUserId?: string; 
}


export default function ActivityPage() {
  const router = useRouter();
  const { toast } = useToast();
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

  const markActivitiesAsRead = async (activityIdsToMark: string[]) => {
    if (!currentUser || activityIdsToMark.length === 0) return;
    const batch = writeBatch(db);
    activityIdsToMark.forEach(id => {
      const activityRef = doc(db, `users/${currentUser.uid}/activityItems`, id);
      batch.update(activityRef, { isRead: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking activities as read: ", error);
      toast({
        variant: "destructive",
        title: "Error updating notifications",
        description: "Could not mark notifications as read.",
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      setIsLoadingActivities(true);
      const activityItemsRef = collection(db, `users/${currentUser.uid}/activityItems`);
      const q = query(activityItemsRef, orderBy('timestamp', 'desc'), limit(50));

      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const fetchedActivities: ActivityItem[] = [];
        const unreadActivityIds: string[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const activity = {
            id: docSnap.id,
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
          } as ActivityItem;
          fetchedActivities.push(activity);
          if (!activity.isRead) {
            unreadActivityIds.push(activity.id);
          }
        });
        setActivities(fetchedActivities);
        setIsLoadingActivities(false);

        if (unreadActivityIds.length > 0) {
          markActivitiesAsRead(unreadActivityIds);
        }
      }, (error) => {
        console.error("Error fetching activity items: ", error);
        setActivities([]);
        setIsLoadingActivities(false);
        toast({
          variant: "destructive",
          title: "Error loading activity",
          description: "Could not fetch your latest activity.",
        });
      });

      return () => unsubscribeFirestore();
    }
  }, [currentUser, toast]);

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
        return <Heart className="h-5 w-5 text-destructive" />; 
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
            {activity.timestamp ? formatDistanceToNowStrict(activity.timestamp, { addSuffix: true }) : 'Just now'}
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
            <span className="text-xs italic">(Note: Generation of these notifications is a backend task. This page displays existing notifications.)</span>
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

