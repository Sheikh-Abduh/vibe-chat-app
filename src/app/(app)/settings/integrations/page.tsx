
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, ArrowLeft, Construction } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

export default function IntegrationsSettingsPage() {
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

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <Link2 className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          App Integrations
        </h1>
      </div>

      <Card className="w-full bg-card border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Connect Your Apps</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Manage connections to third-party applications and services to enhance your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/70 rounded-lg bg-muted/20">
            <Construction className="h-16 w-16 text-accent mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Integrations Coming Soon!</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We're working on bringing you seamless integrations with your favorite apps. Check back later to connect services like social media, calendars, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
