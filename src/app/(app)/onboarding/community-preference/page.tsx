
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

export default function CommunityPreferencePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          router.replace('/dashboard');
        } else {
          setIsCheckingAuth(false);
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handlePreference = (preference: 'yes' | 'no') => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    localStorage.setItem(`community_join_preference_${currentUser.uid}`, preference);
    localStorage.setItem(`onboardingComplete_${currentUser.uid}`, 'true');

    toast({
      title: "Onboarding Complete!",
      description: preference === 'yes' 
        ? "Great! We'll help you find relevant communities." 
        : "No problem! You can explore communities at your own pace.",
    });

    // Simulate API call or further processing if needed
    console.log(`User ${currentUser.uid} preference for joining communities: ${preference}`);

    setTimeout(() => {
      router.push('/dashboard');
      // setIsSubmitting(false); // Not strictly necessary as we are navigating away
    }, 500);
  };
  
  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }
  
  if (!currentUser) {
     return <SplashScreenDisplay />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="w-full max-w-lg bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Join the Vibe?
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-base">
            Would you like to automatically join communities that match your interests and passions?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 pb-2 flex flex-col items-center">
           <Users className="h-20 w-20 text-accent mb-4" />
           <p className="text-sm text-muted-foreground text-center">
            This can help you quickly connect with like-minded people and relevant content. You can always adjust your community memberships later.
           </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6 pb-6">
          <Button
            onClick={() => handlePreference('yes')}
            disabled={isSubmitting || !currentUser}
            className="w-full sm:w-1/2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
            Yes, sounds great!
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePreference('no')}
            disabled={isSubmitting || !currentUser}
            className="w-full sm:w-1/2 border-accent text-accent hover:bg-accent/10 hover:text-accent
                       shadow-[0_0_8px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_12px_hsl(var(--accent)/0.6)]
                       focus:shadow-[0_0_12px_hsl(var(--accent)/0.6)]
                       transition-all duration-300 ease-in-out"
          >
             {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <XCircle className="mr-2 h-5 w-5" />}
            No, I'll explore
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    