
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, ArrowLeft, Users, MonitorPlay, BookOpen, Gamepad2, Construction } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

interface PotentialIntegration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  note?: string;
}

const potentialIntegrations: PotentialIntegration[] = [
  {
    id: 'discord',
    name: 'Discord',
    description: 'Link your Discord profile or connect community servers for seamless interaction.',
    icon: Users, // Using Users icon as a placeholder for a generic social/community icon
  },
  {
    id: 'gaming',
    name: 'Gaming Platforms',
    description: 'Share your gaming activity from platforms like Steam or Epic Games.',
    icon: Gamepad2,
    note: 'Availability of free, non-billed API access varies by platform.',
  },
  {
    id: 'content',
    name: 'Content Platforms',
    description: 'Showcase your favorite books (e.g., Open Library) or movies/TV shows (e.g., TMDb).',
    icon: BookOpen,
    note: 'Always check specific API terms for usage and access.',
  },
  {
    id: 'image_services',
    name: 'Image Services',
    description: 'Use services like Unsplash or Pexels for profile or community customization.',
    icon: MonitorPlay, // Using MonitorPlay as a generic media icon
    note: 'API keys are typically free for basic use.',
  },
];

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
    <div className="p-6 h-full overflow-y-auto"> {/* Added p-6, h-full and overflow-y-auto */}
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
            Enhance your 'vibe' experience by connecting to other services. Many platforms offer free initial access to their APIs.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {potentialIntegrations.map((integration) => (
            <Card key={integration.id} className="bg-muted/30 border-border/40 p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <integration.icon className="h-8 w-8 text-accent mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                  {integration.note && (
                    <p className="text-xs text-muted-foreground/80 mt-1 italic">{integration.note}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 text-right">
                <Button variant="outline" size="sm" disabled className="border-accent/50 text-accent/70">
                  Connect (Coming Soon)
                </Button>
              </div>
            </Card>
          ))}

          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/70 rounded-lg bg-muted/20 mt-8">
            <Construction className="h-12 w-12 text-accent mb-3" />
            <h3 className="text-md font-semibold text-foreground mb-1">More Integrations Planned!</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              We're always looking to add more ways to connect your vibe. Check back for updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    