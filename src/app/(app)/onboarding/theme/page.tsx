
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, Palette, CheckCircle, Loader2, ArrowLeft, RefreshCcw, Ruler } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import type { UiScale } from '@/components/theme/theme-provider';
import { ScrollArea } from '@/components/ui/scroll-area';


type ThemeMode = 'light' | 'dark';

interface AccentColorOption {
  name: string;
  value: string;
  foreground: string; 
  className: string;
}

const accentOptions: AccentColorOption[] = [
  { name: 'Neon Purple', value: '289 85% 55%', foreground: '0 0% 100%', className: 'bg-[hsl(289_85%_55%)]' }, // Updated PRD Primary
  { name: 'Neon Green', value: '110 100% 50%', foreground: '220 3% 10%', className: 'bg-[hsl(110_100%_50%)]' }, // Updated PRD Accent
  { name: 'Crimson Red', value: '348 83% 47%', foreground: '0 0% 100%', className: 'bg-[hsl(348_83%_47%)]' },
  { name: 'Electric Blue', value: '217 91% 59%', foreground: '0 0% 100%', className: 'bg-[hsl(217_91%_59%)]' },
  { name: 'Sunny Yellow', value: '45 100% 51%', foreground: '220 3% 10%', className: 'bg-[hsl(45_100%_51%)]' },
  { name: 'Emerald Green', value: '145 63% 42%', foreground: '0 0% 100%', className: 'bg-[hsl(145_63%_42%)]' }, // Old default secondary for onboarding page
  { name: 'Vibrant Orange', value: '24 95% 53%', foreground: '0 0% 100%', className: 'bg-[hsl(24_95%_53%)]'}
];

// Default theme values (from globals.css - dark mode)
const defaultDarkVars = {
  '--background': '220 3% 10%', '--foreground': '0 0% 98%',
  '--card': '220 3% 12%', '--card-foreground': '0 0% 98%',
  '--popover': '220 3% 10%', '--popover-foreground': '0 0% 98%',
  '--secondary': '220 3% 18%', '--secondary-foreground': '0 0% 98%',
  '--muted': '220 3% 15%', '--muted-foreground': '0 0% 70%',
  '--border': '220 3% 18%', '--input': '220 3% 13%',
};

const defaultLightVars = {
  '--background': '0 0% 100%', '--foreground': '220 3% 10%',
  '--card': '0 0% 97%', '--card-foreground': '220 3% 10%',
  '--popover': '0 0% 100%', '--popover-foreground': '220 3% 10%',
  '--secondary': '0 0% 95%', '--secondary-foreground': '220 3% 10%',
  '--muted': '0 0% 90%', '--muted-foreground': '220 3% 25%',
  '--border': '0 0% 85%', '--input': '0 0% 92%',
};

// PRD specified defaults
const prdPrimaryAccent = accentOptions.find(opt => opt.value === '289 85% 55%')!; 
const prdSecondaryAccent = accentOptions.find(opt => opt.value === '110 100% 50%')!;

const defaultAppThemeForOnboarding = {
    mode: 'dark' as ThemeMode,
    primary: prdPrimaryAccent, 
    secondary: prdSecondaryAccent, // Using PRD Neon Green for secondary accent preview consistency
    scale: 'default' as UiScale,
};

interface UserAppSettings {
    themeMode?: ThemeMode;
    themePrimaryAccent?: string;
    themePrimaryAccentFg?: string;
    themeSecondaryAccent?: string;
    themeSecondaryAccentFg?: string;
    uiScale?: UiScale;
    onboardingComplete?: boolean;
    communityJoinPreference?: 'yes' | 'no';
}


export default function ThemeSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedMode, setSelectedMode] = useState<ThemeMode>(defaultAppThemeForOnboarding.mode);
  const [selectedAccent, setSelectedAccent] = useState<AccentColorOption>(defaultAppThemeForOnboarding.primary);

  const [initialMode, setInitialMode] = useState<ThemeMode | null>(null);
  const [initialAccentValue, setInitialAccentValue] = useState<string | null>(null);
  const [initialAccentFgValue, setInitialAccentFgValue] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const rootStyle = getComputedStyle(document.documentElement);
        const bg = rootStyle.getPropertyValue('--background').trim();
        let currentLightness = 10;
        if (bg.includes(' ') && bg.split(' ').length >=3) {
          const lightnessPart = bg.split(' ')[2];
          if (lightnessPart && lightnessPart.includes('%')) {
            currentLightness = parseInt(lightnessPart.replace('%',''));
          }
        } else if (bg === '0 0% 100%') {
          currentLightness = 100;
        }

        const mode = currentLightness < 50 ? 'dark' : 'light';
        setInitialMode(mode);
        setSelectedMode(mode);

        const primaryColor = rootStyle.getPropertyValue('--primary').trim();
        const primaryFgColor = rootStyle.getPropertyValue('--primary-foreground').trim();
        setInitialAccentValue(primaryColor);
        setInitialAccentFgValue(primaryFgColor);

        const foundAccent = accentOptions.find(opt => opt.value === primaryColor && opt.foreground === primaryFgColor);
        setSelectedAccent(foundAccent || defaultAppThemeForOnboarding.primary);
    }
  }, []);


  const applyTheme = useCallback((mode: ThemeMode, primaryAccentChoice: AccentColorOption) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const themeVars = mode === 'dark' ? defaultDarkVars : defaultLightVars;

      for (const [key, value] of Object.entries(themeVars)) {
        root.style.setProperty(key, value);
      }
      root.style.setProperty('--primary', primaryAccentChoice.value);
      root.style.setProperty('--primary-foreground', primaryAccentChoice.foreground); 
      root.style.setProperty('--ring', primaryAccentChoice.value);

      // Keep secondary accent fixed to the PRD default for this specific page's live preview
      root.style.setProperty('--accent', defaultAppThemeForOnboarding.secondary.value);
      root.style.setProperty('--accent-foreground', defaultAppThemeForOnboarding.secondary.foreground);
    }
  }, []);

  useEffect(() => {
    if (initialMode && initialAccentValue ) {
        applyTheme(selectedMode, selectedAccent);
    }
  }, [selectedMode, selectedAccent, applyTheme, initialMode, initialAccentValue]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().appSettings?.onboardingComplete === true) {
          router.replace('/dashboard');
        } else {
          if (initialMode && initialAccentValue) { // Ensure initial theme values are read before hiding splash
            setIsCheckingAuth(false);
          }
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, initialMode, initialAccentValue]);
  
  useEffect(() => { // Additional effect to ensure splash hides once all conditions met
    if (currentUser && initialMode && initialAccentValue) {
        setIsCheckingAuth(false);
    }
  }, [currentUser, initialMode, initialAccentValue]);


  const handleSave = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    const themeSettingsToSave: Partial<UserAppSettings> = {
      themeMode: selectedMode,
      themePrimaryAccent: selectedAccent.value,
      themePrimaryAccentFg: selectedAccent.foreground,
      themeSecondaryAccent: defaultAppThemeForOnboarding.secondary.value, 
      themeSecondaryAccentFg: defaultAppThemeForOnboarding.secondary.foreground,
      uiScale: defaultAppThemeForOnboarding.scale, 
    };

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let existingAppSettings: Partial<UserAppSettings> = {};
      if (userDocSnap.exists() && userDocSnap.data().appSettings) {
        existingAppSettings = userDocSnap.data().appSettings;
      }

      const updatedAppSettings: Partial<UserAppSettings> = {
        ...existingAppSettings,
        ...themeSettingsToSave
      };

      await setDoc(userDocRef, {
        appSettings: updatedAppSettings
      }, { merge: true });


      toast({
        title: "Theme Preferences Saved!",
        description: "One last step to personalize your experience.",
      });

      router.push('/onboarding/community-preference');
    } catch (error) {
      console.error("Error saving theme to Firestore:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save theme preferences." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
     if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    
    // Apply application defaults before proceeding
    applyTheme(defaultAppThemeForOnboarding.mode, defaultAppThemeForOnboarding.primary);

    const defaultSettingsToSave: Partial<UserAppSettings> = {
        themeMode: defaultAppThemeForOnboarding.mode,
        themePrimaryAccent: defaultAppThemeForOnboarding.primary.value,
        themePrimaryAccentFg: defaultAppThemeForOnboarding.primary.foreground,
        themeSecondaryAccent: defaultAppThemeForOnboarding.secondary.value,
        themeSecondaryAccentFg: defaultAppThemeForOnboarding.secondary.foreground,
        uiScale: defaultAppThemeForOnboarding.scale,
    };

    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let existingAppSettings: Partial<UserAppSettings> = {};
        if (userDocSnap.exists() && userDocSnap.data().appSettings) {
            existingAppSettings = userDocSnap.data().appSettings;
        }

        const updatedAppSettings: Partial<UserAppSettings> = {
            ...existingAppSettings,
            ...defaultSettingsToSave
        };

        await setDoc(userDocRef, { appSettings: updatedAppSettings }, { merge: true });

        toast({
          title: 'Skipping Theme Customization',
          description: 'Proceeding to the final onboarding step with default theme.',
        });
        router.push('/onboarding/community-preference');
    } catch (error) {
        console.error("Error saving default theme to Firestore:", error);
        toast({ variant: "destructive", title: "Skip Failed", description: "Could not save default theme preferences." });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && initialMode && initialAccentValue && initialAccentFgValue && currentUser && !isSubmitting) {
        const userDocRef = doc(db, "users", currentUser.uid);
        getDoc(userDocRef).then(snap => {
            let finalMode = initialMode;
            let finalPrimaryValue = initialAccentValue;
            let finalPrimaryFgValue = initialAccentFgValue;

            if (snap.exists() && snap.data().appSettings?.themePrimaryAccent) {
                 const savedSettings = snap.data().appSettings as UserAppSettings;
                 finalMode = savedSettings.themeMode || initialMode;
                 finalPrimaryValue = savedSettings.themePrimaryAccent || initialAccentValue;
                 finalPrimaryFgValue = savedSettings.themePrimaryAccentFg || initialAccentFgValue;
            }
            
            const finalPrimaryAccent = accentOptions.find(opt => opt.value === finalPrimaryValue && opt.foreground === finalPrimaryFgValue) || defaultAppThemeForOnboarding.primary;
            applyTheme(finalMode, finalPrimaryAccent);
        });
      }
    };
  }, [initialMode, initialAccentValue, initialAccentFgValue, currentUser, isSubmitting, applyTheme]);


  if (isCheckingAuth || !initialMode || !currentUser) { 
    return <SplashScreenDisplay />;
  }


  return (
    <div className="flex h-full items-center justify-center overflow-y-auto overflow-x-hidden bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="flex flex-col w-full max-w-lg max-h-[90vh] bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4 shrink-0">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Customize Your vibe
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Choose your preferred theme mode and primary accent color.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-8 px-6 pt-2 pb-6">
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
                  <Palette className="mr-2 h-6 w-6 text-accent" /> Primary Accent Color
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
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
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6 pb-6 shrink-0">
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !currentUser}
            className="w-full sm:w-1/2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" /> }
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting || !currentUser}
            className="w-full sm:w-1/2 text-muted-foreground hover:text-accent/80"
          >
            Skip and use defaults
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
