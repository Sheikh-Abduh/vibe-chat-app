
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; 
import { doc, setDoc, getDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

interface UserAppSettings {
  onboardingComplete?: boolean;
  communityJoinPreference?: 'yes' | 'no';
  themeMode?: 'light' | 'dark';
  themePrimaryAccent?: string;
  themePrimaryAccentFg?: string;
  themeSecondaryAccent?: string;
  themeSecondaryAccentFg?: string;
  uiScale?: 'compact' | 'default' | 'comfortable';
}


export default function CommunityPreferencePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().appSettings?.onboardingComplete === true) {
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

  const handlePreference = async (preference: 'yes' | 'no') => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      
      // Fetch existing appSettings to merge with
      const userDocSnap = await getDoc(userDocRef);
      let existingAppSettings: Partial<UserAppSettings> = {};
      if (userDocSnap.exists() && userDocSnap.data().appSettings) {
        existingAppSettings = userDocSnap.data().appSettings;
      }
      
      const updatedAppSettings: Partial<UserAppSettings> = {
        ...existingAppSettings, // Preserve existing settings like theme
        communityJoinPreference: preference,
        onboardingComplete: true, // Mark onboarding as complete here
      };

      await setDoc(userDocRef, { 
        appSettings: updatedAppSettings
      }, { merge: true });

      toast({
        title: "Onboarding Complete!",
        description: preference === 'yes' 
          ? "Great! We'll help you find relevant communities." 
          : "No problem! You can explore communities at your own pace.",
      });
      
      // Clear old localStorage flags (if any were used before Firestore persistence)
      localStorage.removeItem(`onboardingComplete_${currentUser.uid}`); 
      localStorage.removeItem(`community_join_preference_${currentUser.uid}`);
      localStorage.removeItem(`theme_mode_${currentUser.uid}`);
      localStorage.removeItem(`theme_accent_primary_${currentUser.uid}`);
      localStorage.removeItem(`theme_accent_primary_fg_${currentUser.uid}`);
      localStorage.removeItem(`theme_accent_secondary_${currentUser.uid}`);
      localStorage.removeItem(`theme_accent_secondary_fg_${currentUser.uid}`);
      localStorage.removeItem(`ui_scale_${currentUser.uid}`);


      router.push('/dashboard');
    } catch (error) {
      console.error("Error saving onboarding preference to Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save your preference. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }
  
  if (!currentUser) {
     return <SplashScreenDisplay />;
  }

  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="flex flex-col w-full max-w-lg max-h-[90vh] bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4 shrink-0">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Join the Vibe?
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-base">
            Would you like to automatically join communities that match your interests and passions?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="px-6 pt-4 pb-2 flex flex-col items-center">
              <Users className="h-20 w-20 text-accent mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                This can help you quickly connect with like-minded people and relevant content. You can always adjust your community memberships later.
              </p>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6 pb-6 shrink-0">
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
