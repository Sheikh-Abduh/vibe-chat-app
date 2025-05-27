
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BellDot, MessageSquareReply, AtSign, ArrowLeft, Users, Settings } from 'lucide-react';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { formatDistanceToNowStrict } from 'date-fns';

// Placeholder data for activity items
const placeholderActivities = [
  {
    id: '1',
    type: 'mention',
    user: { name: 'Alice Wonderland', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'woman smiling' },
    content: 'mentioned you in #general chat: "Hey @YourUsername, check this out!"',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    link: '#', // Placeholder link
  },
  {
    id: '2',
    type: 'reply',
    user: { name: 'Bob The Builder', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'man construction' },
    content: 'replied to your message: "I agree, that\'s a great point!"',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    link: '#',
  },
  {
    id: '3',
    type: 'mention',
    user: { name: 'Charlie Brown', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'boy cartoon' },
    content: 'mentioned you in DM: "Did you see the latest update?"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    link: '#',
  },
  {
    id: '4',
    type: 'community_join', // Example of another activity type
    user: { name: 'Gamers Unite Bot', avatarUrl: 'https://placehold.co/40x40.png', dataAiHint: 'robot abstract' },
    content: 'Welcome to the Gamers Unite community!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    link: '#',
  },
];

type ActivityItem = typeof placeholderActivities[0];

export default function ActivityPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>(placeholderActivities); // Using placeholder data

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        // In a real app, you would fetch user-specific notifications here
        // e.g., from users/{currentUser.uid}/notifications in Firestore
      } else {
        router.replace('/login');
      }
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-5 w-5 text-primary" />;
      case 'reply':
        return <MessageSquareReply className="h-5 w-5 text-accent" />;
      case 'community_join':
        return <Users className="h-5 w-5 text-blue-500" />;
      default:
        return <BellDot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
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
          <CardTitle className="text-xl text-foreground">Recent Notifications</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Stay updated with mentions, replies, and other important events. (Placeholder data shown)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {activities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No new activity.
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {activities.map((activity) => (
                  <a 
                    key={activity.id} 
                    href={activity.link} 
                    onClick={(e) => { e.preventDefault(); /* Implement navigation or action */}}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/30"
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 mt-0.5">
                        <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} data-ai-hint={activity.user.dataAiHint} />
                        <AvatarFallback>{activity.user.name.substring(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">{activity.user.name}</span> {activity.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(activity.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {renderIcon(activity.type)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
