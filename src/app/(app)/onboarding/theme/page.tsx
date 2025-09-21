
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

interface ColorPalette {
  name: string;
  description: string;
  primary: { value: string; foreground: string; };
  secondary: { value: string; foreground: string; };
  preview: { colors: string[]; };
}

// Simplified palette options for onboarding
const onboardingPalettes: ColorPalette[] = [
  {
    name: 'Nebula',
    description: 'Deep navy, cosmic purple, and bright teal',
    primary: { value: '250 84% 54%', foreground: '0 0% 100%' },
    secondary: { value: '180 100% 50%', foreground: '220 26% 14%' },
    preview: { colors: ['hsl(220_26%_14%)', 'hsl(250_84%_54%)', 'hsl(180_100%_50%)'] }
  },
  {
    name: 'Pulse',
    description: 'Electric blue, mint green, and vibrant violet',
    primary: { value: '217 91% 59%', foreground: '0 0% 100%' },
    secondary: { value: '150 100% 66%', foreground: '220 3% 10%' },
    preview: { colors: ['hsl(217_91%_59%)', 'hsl(150_100%_66%)', 'hsl(271_81%_56%)'] }
  },
  {
    name: 'Aurora',
    description: 'Gradient mix of cyan, magenta, and violet',
    primary: { value: '300 76% 72%', foreground: '0 0% 100%' },
    secondary: { value: '180 100% 50%', foreground: '0 0% 100%' },
    preview: { colors: ['hsl(180_100%_50%)', 'hsl(300_76%_72%)', 'hsl(270_50%_60%)'] }
  }
];

const defaultPalette = onboardingPalettes[0]; // Default to Nebula

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

const defaultAppThemeForOnboarding = {
    mode: 'dark' as ThemeMode,
    palette: defaultPalette,
    scale: 'default' as UiScale,
};

interface UserAppSettings {
    themeMode?: ThemeMode;
    colorPalette?: string;
    // Legacy compatibility
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
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(defaultAppThemeForOnboarding.palette);

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

        const foundPalette = onboardingPalettes.find(p => 
          p.primary.value === primaryColor && p.primary.foreground === primaryFgColor
        );
        setSelectedPalette(foundPalette || defaultAppThemeForOnboarding.palette);
    }
  }, []);


  const applyTheme = useCallback((mode: ThemeMode, palette: ColorPalette) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const themeVars = mode === 'dark' ? defaultDarkVars : defaultLightVars;

      for (const [key, value] of Object.entries(themeVars)) {
        root.style.setProperty(key, value);
      }
      root.style.setProperty('--primary', palette.primary.value);
      root.style.setProperty('--primary-foreground', palette.primary.foreground); 
      root.style.setProperty('--ring', palette.primary.value);
      root.style.setProperty('--accent', palette.secondary.value);
      root.style.setProperty('--accent-foreground', palette.secondary.foreground);
    }
  }, []);

  useEffect(() => {
    if (initialMode && initialAccentValue ) {
        applyTheme(selectedMode, selectedPalette);
    }
  }, [selectedMode, selectedPalette, applyTheme, initialMode, initialAccentValue]);

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
      colorPalette: selectedPalette.name,
      // Also save individual colors for backward compatibility
      themePrimaryAccent: selectedPalette.primary.value,
      themePrimaryAccentFg: selectedPalette.primary.foreground,
      themeSecondaryAccent: selectedPalette.secondary.value, 
      themeSecondaryAccentFg: selectedPalette.secondary.foreground,
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
    applyTheme(defaultAppThemeForOnboarding.mode, defaultAppThemeForOnboarding.palette);

    const defaultSettingsToSave: Partial<UserAppSettings> = {
        themeMode: defaultAppThemeForOnboarding.mode,
        colorPalette: defaultAppThemeForOnboarding.palette.name,
        themePrimaryAccent: defaultAppThemeForOnboarding.palette.primary.value,
        themePrimaryAccentFg: defaultAppThemeForOnboarding.palette.primary.foreground,
        themeSecondaryAccent: defaultAppThemeForOnboarding.palette.secondary.value,
        themeSecondaryAccentFg: defaultAppThemeForOnboarding.palette.secondary.foreground,
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
            let finalPalette = defaultAppThemeForOnboarding.palette;

            if (snap.exists() && snap.data().appSettings) {
                 const savedSettings = snap.data().appSettings as UserAppSettings;
                 finalMode = savedSettings.themeMode || initialMode;
                 
                 if (savedSettings.colorPalette) {
                   const foundPalette = onboardingPalettes.find(p => p.name === savedSettings.colorPalette);
                   if (foundPalette) {
                     finalPalette = foundPalette;
                   }
                 } else if (savedSettings.themePrimaryAccent) {
                   // Backward compatibility
                   const foundPalette = onboardingPalettes.find(p => 
                     p.primary.value === savedSettings.themePrimaryAccent && 
                     p.primary.foreground === savedSettings.themePrimaryAccentFg
                   );
                   if (foundPalette) {
                     finalPalette = foundPalette;
                   }
                 }
            }
            
            applyTheme(finalMode, finalPalette);
        });
      }
    };
  }, [initialMode, initialAccentValue, initialAccentFgValue, currentUser, isSubmitting, applyTheme]);


  if (isCheckingAuth || !initialMode || !currentUser) { 
    return <SplashScreenDisplay />;
  }


  return (
    <div className="flex h-full items-center justify-center overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-4 md:p-6 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="flex flex-col w-full max-w-sm sm:max-w-md md:max-w-lg max-h-[95vh] sm:max-h-[90vh] bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Customize Your vibe
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground pt-1">
            Choose your preferred theme mode and color palette.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 pt-2 pb-4 sm:pb-6">
              <div className="space-y-3">
                <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                  <Palette className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-accent" /> Theme Mode
                </Label>
                <RadioGroup
                  value={selectedMode}
                  onValueChange={(value: string) => setSelectedMode(value as ThemeMode)}
                  className="grid grid-cols-2 gap-3 sm:gap-4"
                >
                  <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label
                      htmlFor="light"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <Sun className="mb-2 h-6 w-6 sm:h-7 sm:w-7" />
                      <span className="text-sm sm:text-base">Light Mode</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label
                      htmlFor="dark"
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                      )}
                    >
                      <Moon className="mb-2 h-6 w-6 sm:h-7 sm:w-7" />
                      <span className="text-sm sm:text-base">Dark Mode</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                  <Palette className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-accent" /> Color Palette
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {onboardingPalettes.map((palette) => (
                    <Button
                      key={palette.name}
                      variant="outline"
                      onClick={() => setSelectedPalette(palette)}
                      className={cn(
                        "h-16 sm:h-20 w-full flex items-center justify-between border-2 p-3 sm:p-4 transition-all duration-200 ease-in-out",
                        selectedPalette.name === palette.name ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)] scale-105' : 'border-muted hover:border-foreground/50',
                        "focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                      )}
                      style={{ borderColor: selectedPalette.name === palette.name ? `hsl(${palette.primary.value})` : undefined }}
                    >
                      {/* Palette Info */}
                      <div className="text-left flex-1 min-w-0">
                        <span className="font-semibold text-sm sm:text-base text-foreground">{palette.name}</span>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{palette.description}</p>
                      </div>
                      
                      {/* Palette Preview */}
                      <div className="flex items-center space-x-1.5 sm:space-x-2 ml-3 sm:ml-4 shrink-0">
                        {palette.preview.colors.map((color, index) => (
                          <div 
                            key={index}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-foreground/20"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {selectedPalette.name === palette.name && (
                          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary ml-1.5 sm:ml-2" style={{ color: `hsl(${palette.primary.value})` }}/>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:gap-4 pt-4 sm:pt-6 pb-4 sm:pb-6 shrink-0">
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !currentUser}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base py-2.5 sm:py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> }
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting || !currentUser}
            className="w-full text-muted-foreground hover:text-accent/80 text-sm sm:text-base"
          >
            Skip and use defaults
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
