
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, Palette, CheckCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

type ThemeMode = 'light' | 'dark';

interface AccentColorOption {
  name: string;
  value: string; // HSL string for --primary
  primaryForeground: string; // HSL string for --primary-foreground
  className: string; // Tailwind class for bg color of swatch
}

const accentOptions: AccentColorOption[] = [
  { name: 'Neon Purple', value: '289 85% 45%', primaryForeground: '0 0% 100%', className: 'bg-[hsl(289_85%_45%)]' },
  { name: 'Crimson Red', value: '348 83% 47%', primaryForeground: '0 0% 100%', className: 'bg-[hsl(348_83%_47%)]' },
  { name: 'Electric Blue', value: '217 91% 59%', primaryForeground: '0 0% 100%', className: 'bg-[hsl(217_91%_59%)]' },
  { name: 'Sunny Yellow', value: '45 100% 51%', primaryForeground: '220 3% 10%', className: 'bg-[hsl(45_100%_51%)]' },
  { name: 'Emerald Green', value: '145 63% 42%', primaryForeground: '0 0% 100%', className: 'bg-[hsl(145_63%_42%)]' },
  { name: 'Vibrant Orange', value: '24 95% 53%', primaryForeground: '0 0% 100%', className: 'bg-[hsl(24_95%_53%)]'}
];

// Default theme values (from globals.css - dark mode)
const defaultDarkVars = {
  '--background': '220 3% 10%',
  '--foreground': '0 0% 98%',
  '--card': '220 3% 12%',
  '--card-foreground': '0 0% 98%',
  '--popover': '220 3% 10%',
  '--popover-foreground': '0 0% 98%',
  '--secondary': '220 3% 18%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '220 3% 15%',
  '--muted-foreground': '0 0% 70%',
  '--border': '220 3% 18%',
  '--input': '220 3% 13%',
};

const defaultLightVars = {
  '--background': '0 0% 100%',
  '--foreground': '220 3% 10%',
  '--card': '0 0% 97%',
  '--card-foreground': '220 3% 10%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '220 3% 10%',
  '--secondary': '0 0% 95%',
  '--secondary-foreground': '220 3% 10%',
  '--muted': '0 0% 90%',
  '--muted-foreground': '220 3% 25%',
  '--border': '0 0% 85%',
  '--input': '0 0% 92%',
};


export default function ThemeSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedMode, setSelectedMode] = useState<ThemeMode>('dark');
  const [selectedAccent, setSelectedAccent] = useState<AccentColorOption>(accentOptions[0]);
  
  const [initialMode, setInitialMode] = useState<ThemeMode | null>(null);
  const [initialAccentValue, setInitialAccentValue] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const rootStyle = getComputedStyle(document.documentElement);
        const bg = rootStyle.getPropertyValue('--background').trim();
        const currentLightness = bg.split(' ').length === 3 ? parseInt(bg.split(' ')[2].replace('%','')) : 10;
        
        const mode = currentLightness < 50 ? 'dark' : 'light';
        setInitialMode(mode);
        setSelectedMode(mode);

        const primaryColor = rootStyle.getPropertyValue('--primary').trim();
        setInitialAccentValue(primaryColor);
        const foundAccent = accentOptions.find(opt => opt.value === primaryColor);
        setSelectedAccent(foundAccent || accentOptions[0]);
    }
  }, []);


  const applyTheme = useCallback((mode: ThemeMode, accent: AccentColorOption) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const themeVars = mode === 'dark' ? defaultDarkVars : defaultLightVars;

      for (const [key, value] of Object.entries(themeVars)) {
        root.style.setProperty(key, value);
      }
      root.style.setProperty('--primary', accent.value);
      root.style.setProperty('--primary-foreground', accent.primaryForeground);
      root.style.setProperty('--ring', accent.value); 
    }
  }, []);

  useEffect(() => {
    if (initialMode && initialAccentValue ) { 
        applyTheme(selectedMode, selectedAccent);
    }
  }, [selectedMode, selectedAccent, applyTheme, initialMode, initialAccentValue]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          router.replace('/dashboard');
        } else {
           // Only set checking auth to false if onboarding is not complete AND initial theme values are set
          if (initialMode && initialAccentValue) {
            setIsCheckingAuth(false);
          }
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, initialMode, initialAccentValue]);

   // Effect to update isCheckingAuth when initial theme values are loaded
  useEffect(() => {
    if (currentUser && initialMode && initialAccentValue) {
      const onboardingComplete = localStorage.getItem(`onboardingComplete_${currentUser.uid}`);
      if (onboardingComplete !== 'true') {
        setIsCheckingAuth(false);
      }
    }
  }, [currentUser, initialMode, initialAccentValue]);


  const handleSave = () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    localStorage.setItem(`theme_mode_${currentUser.uid}`, selectedMode);
    localStorage.setItem(`theme_accent_primary_${currentUser.uid}`, selectedAccent.value);
    localStorage.setItem(`theme_accent_primary_fg_${currentUser.uid}`, selectedAccent.primaryForeground);
    localStorage.setItem(`onboardingComplete_${currentUser.uid}`, 'true');

    toast({
      title: "Theme Preferences Saved!",
      description: "Your app experience is now personalized.",
    });

    setTimeout(() => {
      router.push('/dashboard');
      // No need to setIsSubmitting(false) as we are navigating away.
    }, 500);
  };

  const handleSkip = () => {
     if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    localStorage.setItem(`onboardingComplete_${currentUser.uid}`, 'true');
    toast({
      title: 'Skipping Theme Customization',
      description: 'Proceeding to the dashboard with default theme.',
    });
     // Revert to initial theme if skipped
    if (initialMode && initialAccentValue) {
        const root = document.documentElement;
        const themeVars = initialMode === 'dark' ? defaultDarkVars : defaultLightVars;
        for (const [key, value] of Object.entries(themeVars)) {
            root.style.setProperty(key, value);
        }
        root.style.setProperty('--primary', initialAccentValue);
        const originalAccentObj = accentOptions.find(opt => opt.value === initialAccentValue);
        root.style.setProperty('--primary-foreground', originalAccentObj ? originalAccentObj.primaryForeground : (initialMode === 'dark' ? '0 0% 100%' : '0 0% 10%'));
        root.style.setProperty('--ring', initialAccentValue);
    }
    router.push('/dashboard');
  };
  
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && initialMode && initialAccentValue && currentUser) {
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${currentUser.uid}`);
        // Only revert if onboarding was not completed (i.e., user navigated away without Save or Skip)
        if (onboardingComplete !== 'true' && !isSubmitting) { // Added !isSubmitting check
            const root = document.documentElement;
            const themeVars = initialMode === 'dark' ? defaultDarkVars : defaultLightVars;
             for (const [key, value] of Object.entries(themeVars)) {
                root.style.setProperty(key, value);
            }
            root.style.setProperty('--primary', initialAccentValue);
            const originalAccentObj = accentOptions.find(opt => opt.value === initialAccentValue);
            root.style.setProperty('--primary-foreground', originalAccentObj ? originalAccentObj.primaryForeground : (initialMode === 'dark' ? '0 0% 100%' : '0 0% 10%'));
            root.style.setProperty('--ring', initialAccentValue);
        }
      }
    };
  }, [initialMode, initialAccentValue, currentUser, isSubmitting]);


  if (isCheckingAuth) { // Covers auth check AND initial theme values loading
    return <SplashScreenDisplay />;
  }
  
  if (!currentUser) { // Fallback if somehow auth check passes but no current user
     return <SplashScreenDisplay />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="w-full max-w-lg bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Customize Your Vibe
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Choose your preferred theme mode and accent color.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-2">
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
              <Palette className="mr-2 h-6 w-6 text-accent" /> Theme Mode
            </Label>
            <RadioGroup
              value={selectedMode}
              onValueChange={(value: string) => setSelectedMode(value as ThemeMode)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  <Sun className="mb-2 h-7 w-7" />
                  Light Mode
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  <Moon className="mb-2 h-7 w-7" />
                  Dark Mode
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
              <Palette className="mr-2 h-6 w-6 text-accent" /> Accent Color (Primary)
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {accentOptions.map((accent) => (
                <Button
                  key={accent.name}
                  variant="outline"
                  onClick={() => setSelectedAccent(accent)}
                  className={cn(
                    "h-20 w-full flex flex-col items-center justify-center border-2 p-2 transition-all duration-200 ease-in-out",
                    selectedAccent.value === accent.value ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)] scale-105' : 'border-muted hover:border-foreground/50',
                    "focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  )}
                  style={{ borderColor: selectedAccent.value === accent.value ? `hsl(${accent.value})` : undefined }}
                >
                  <div className={cn("h-8 w-8 rounded-full mb-2 border border-foreground/20", accent.className)} />
                  <span className="text-xs text-center text-muted-foreground">{accent.name}</span>
                   {selectedAccent.value === accent.value && (
                    <CheckCircle className="h-5 w-5 text-primary absolute top-1 right-1" style={{ color: `hsl(${accent.value})` }}/>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-8">
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !currentUser}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>}
            {isSubmitting ? 'Saving...' : 'Save & Finish Onboarding'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting || !currentUser}
            className="w-full text-muted-foreground hover:text-accent/80"
          >
            Skip and use defaults
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
