
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser) {
     return <SplashScreenDisplay />;
  }

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <Bell className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Notification Settings
        </h1>
      </div>
      <Card className="w-full bg-card border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Manage Your Notifications</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Choose how and when you want to be notified. (Settings coming soon!)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-4">
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="mx-auto h-16 w-16 mb-4" />
            <p className="text-lg">Notification preferences will be available here.</p>
            <p className="text-sm">Configure email, push, and in-app notifications.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
