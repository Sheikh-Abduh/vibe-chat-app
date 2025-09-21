
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


type ThemeMode = 'light' | 'dark';

interface ColorPalette {
  name: string;
  description: string;
  primary: {
    value: string;
    foreground: string;
  };
  secondary: {
    value: string;
    foreground: string;
  };
  preview: {
    colors: string[];
    className: string;
  };
}

const colorPalettes: ColorPalette[] = [
  {
    name: 'Nebula',
    description: 'Deep navy, cosmic purple, and bright teal accents',
    primary: {
      value: '250 84% 54%', // Cosmic purple
      foreground: '0 0% 100%'
    },
    secondary: {
      value: '180 100% 50%', // Bright teal
      foreground: '220 26% 14%'
    },
    preview: {
      colors: ['hsl(220_26%_14%)', 'hsl(250_84%_54%)', 'hsl(180_100%_50%)'], // Deep navy, cosmic purple, bright teal
      className: 'bg-gradient-to-r from-[hsl(220_26%_14%)] via-[hsl(250_84%_54%)] to-[hsl(180_100%_50%)]'
    }
  },
  {
    name: 'Solaris',
    description: 'Warm amber, coral orange, sandy beige, and sunlit yellow',
    primary: {
      value: '35 91% 58%', // Warm amber
      foreground: '0 0% 100%'
    },
    secondary: {
      value: '16 90% 66%', // Coral orange
      foreground: '0 0% 100%'
    },
    preview: {
      colors: ['hsl(35_91%_58%)', 'hsl(16_90%_66%)', 'hsl(45_67%_80%)', 'hsl(55_100%_85%)'], // Amber, coral, sandy beige, sunlit yellow
      className: 'bg-gradient-to-r from-[hsl(35_91%_58%)] via-[hsl(16_90%_66%)] via-[hsl(45_67%_80%)] to-[hsl(55_100%_85%)]'
    }
  },
  {
    name: 'Obsidian',
    description: 'Charcoal black, slate gray, with neon green/blue highlights',
    primary: {
      value: '200 6% 10%', // Charcoal black
      foreground: '120 100% 50%' // Neon green text
    },
    secondary: {
      value: '195 100% 50%', // Neon blue
      foreground: '200 6% 10%'
    },
    preview: {
      colors: ['hsl(200_6%_10%)', 'hsl(210_9%_31%)', 'hsl(120_100%_50%)', 'hsl(195_100%_50%)'], // Charcoal, slate, neon green, neon blue
      className: 'bg-gradient-to-r from-[hsl(200_6%_10%)] via-[hsl(210_9%_31%)] via-[hsl(120_100%_50%)] to-[hsl(195_100%_50%)]'
    }
  },
  {
    name: 'Aurora',
    description: 'Gradient mix of cyan, magenta, violet, and soft white',
    primary: {
      value: '300 76% 72%', // Magenta
      foreground: '0 0% 100%'
    },
    secondary: {
      value: '180 100% 50%', // Cyan
      foreground: '0 0% 100%'
    },
    preview: {
      colors: ['hsl(180_100%_50%)', 'hsl(300_76%_72%)', 'hsl(270_50%_60%)', 'hsl(0_0%_95%)'], // Cyan, magenta, violet, soft white
      className: 'bg-gradient-to-r from-[hsl(180_100%_50%)] via-[hsl(300_76%_72%)] via-[hsl(270_50%_60%)] to-[hsl(0_0%_95%)]'
    }
  },
  {
    name: 'Pulse',
    description: 'Crisp white, electric blue, mint green, and vibrant violet',
    primary: {
      value: '217 91% 59%', // Electric blue
      foreground: '0 0% 100%'
    },
    secondary: {
      value: '150 100% 66%', // Mint green
      foreground: '220 3% 10%'
    },
    preview: {
      colors: ['hsl(0_0%_100%)', 'hsl(217_91%_59%)', 'hsl(150_100%_66%)', 'hsl(271_81%_56%)'], // Crisp white, electric blue, mint green, vibrant violet
      className: 'bg-gradient-to-r from-[hsl(0_0%_100%)] via-[hsl(217_91%_59%)] via-[hsl(150_100%_66%)] to-[hsl(271_81%_56%)]'
    }
  }
];

const uiScaleOptions: { label: string; value: UiScale }[] = [
  { label: 'Compact', value: 'compact' },
  { label: 'Default', value: 'default' },
  { label: 'Comfortable', value: 'comfortable' },
];

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

// Default to Nebula palette
const defaultPalette = colorPalettes[0];

const appDefaultTheme = {
    mode: 'dark' as ThemeMode,
    palette: defaultPalette,
    scale: 'default' as UiScale,
};

interface UserAppSettings {
  themeMode?: ThemeMode;
  colorPalette?: string; // Store palette name instead of individual colors
  uiScale?: UiScale;
  // Keep legacy fields for backward compatibility
  themePrimaryAccent?: string;
  themePrimaryAccentFg?: string;
  themeSecondaryAccent?: string;
  themeSecondaryAccentFg?: string;
}


export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedMode, setSelectedMode] = useState<ThemeMode>(appDefaultTheme.mode);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(appDefaultTheme.palette);
  const [selectedUiScale, setSelectedUiScale] = useState<UiScale>(appDefaultTheme.scale);

  const [initialValues, setInitialValues] = useState<UserAppSettings | null>(null);

  const applyThemeAndScale = useCallback((mode: ThemeMode, palette: ColorPalette, scale: UiScale) => {
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

      root.classList.remove('ui-scale-compact', 'ui-scale-default', 'ui-scale-comfortable');
      root.classList.add(`ui-scale-${scale}`);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let loadedSettings: UserAppSettings = {
            themeMode: appDefaultTheme.mode,
            colorPalette: appDefaultTheme.palette.name,
            uiScale: appDefaultTheme.scale,
        };

        if (userDocSnap.exists()) {
            const firestoreSettings = userDocSnap.data().appSettings as UserAppSettings | undefined;
            if (firestoreSettings) {
                loadedSettings = { ...loadedSettings, ...firestoreSettings };
            }
        }

        // Find the current palette, with fallback to default
        let currentPalette = appDefaultTheme.palette;
        if (loadedSettings.colorPalette) {
          // Try to find by new palette name system
          const foundPalette = colorPalettes.find(p => p.name === loadedSettings.colorPalette);
          if (foundPalette) {
            currentPalette = foundPalette;
          }
        } else if (loadedSettings.themePrimaryAccent && loadedSettings.themeSecondaryAccent) {
          // Backward compatibility: try to match legacy colors to a palette
          const matchingPalette = colorPalettes.find(p => 
            p.primary.value === loadedSettings.themePrimaryAccent && 
            p.secondary.value === loadedSettings.themeSecondaryAccent
          );
          if (matchingPalette) {
            currentPalette = matchingPalette;
          }
        }
        
        setSelectedMode(loadedSettings.themeMode!);
        setSelectedPalette(currentPalette);
        setSelectedUiScale(loadedSettings.uiScale!);
        
        setInitialValues({
            themeMode: loadedSettings.themeMode!,
            colorPalette: currentPalette.name,
            uiScale: loadedSettings.uiScale!,
        });
        applyThemeAndScale(loadedSettings.themeMode!, currentPalette, loadedSettings.uiScale!);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, applyThemeAndScale]);

  useEffect(() => {
    if (initialValues) { 
        applyThemeAndScale(selectedMode, selectedPalette, selectedUiScale);
    }
  }, [selectedMode, selectedPalette, selectedUiScale, applyThemeAndScale, initialValues]);

  useEffect(() => {
    return () => {
      if (initialValues && !isSubmitting && typeof window !== 'undefined') {
        const palette = colorPalettes.find(p => p.name === initialValues.colorPalette) || appDefaultTheme.palette;
        applyThemeAndScale(initialValues.themeMode!, palette, initialValues.uiScale!);
      }
    };
  }, [initialValues, isSubmitting, applyThemeAndScale]);


  const handleSaveChanges = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    const newAppSettings: UserAppSettings = {
        themeMode: selectedMode,
        colorPalette: selectedPalette.name,
        uiScale: selectedUiScale,
        // Also save individual colors for backward compatibility
        themePrimaryAccent: selectedPalette.primary.value,
        themePrimaryAccentFg: selectedPalette.primary.foreground,
        themeSecondaryAccent: selectedPalette.secondary.value,
        themeSecondaryAccentFg: selectedPalette.secondary.foreground,
    };

    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let existingAppSettings: Partial<UserAppSettings> = {};
        if (userDocSnap.exists() && userDocSnap.data().appSettings) {
            existingAppSettings = userDocSnap.data().appSettings;
        }
        
        const updatedAppSettings: UserAppSettings = {
            ...existingAppSettings, 
            ...newAppSettings 
        };
        
        await setDoc(userDocRef, { appSettings: updatedAppSettings }, { merge: true });
        
        toast({
          title: "Appearance Settings Saved!",
          description: `Your theme preferences have been updated to ${selectedPalette.name}.`,
        });
        setInitialValues({ 
            themeMode: selectedMode,
            colorPalette: selectedPalette.name,
            uiScale: selectedUiScale,
        }); 
    } catch (error) {
        console.error("Error saving appearance settings to Firestore:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save appearance settings." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (initialValues) {
      const palette = colorPalettes.find(p => p.name === initialValues.colorPalette) || appDefaultTheme.palette;
      applyThemeAndScale(initialValues.themeMode!, palette, initialValues.uiScale!);
      setSelectedMode(initialValues.themeMode!);
      setSelectedPalette(palette);
      setSelectedUiScale(initialValues.uiScale!);
    }
    router.push('/settings');
  };

  const handleResetToDefaults = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      return;
    }
    setIsSubmitting(true); 

    const defaultSettings: UserAppSettings = {
        themeMode: appDefaultTheme.mode,
        colorPalette: appDefaultTheme.palette.name,
        uiScale: appDefaultTheme.scale,
        // Also set individual colors for backward compatibility
        themePrimaryAccent: appDefaultTheme.palette.primary.value,
        themePrimaryAccentFg: appDefaultTheme.palette.primary.foreground,
        themeSecondaryAccent: appDefaultTheme.palette.secondary.value,
        themeSecondaryAccentFg: appDefaultTheme.palette.secondary.foreground,
    };

    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let existingAppSettings: Partial<UserAppSettings> = {};
        if (userDocSnap.exists() && userDocSnap.data().appSettings) {
            existingAppSettings = userDocSnap.data().appSettings;
        }
        
        const updatedAppSettings: UserAppSettings = {
            ...existingAppSettings, 
            ...defaultSettings 
        };

        await setDoc(userDocRef, { appSettings: updatedAppSettings }, { merge: true });

        setSelectedMode(appDefaultTheme.mode);
        setSelectedPalette(appDefaultTheme.palette);
        setSelectedUiScale(appDefaultTheme.scale);

        applyThemeAndScale(appDefaultTheme.mode, appDefaultTheme.palette, appDefaultTheme.scale);
        setInitialValues({
            themeMode: appDefaultTheme.mode,
            colorPalette: appDefaultTheme.palette.name,
            uiScale: appDefaultTheme.scale,
        }); 

        toast({
          title: "Settings Reset",
          description: `Appearance settings have been reset to default (${appDefaultTheme.palette.name}).`,
        });
    } catch (error) {
        console.error("Error resetting theme to Firestore:", error);
        toast({ variant: "destructive", title: "Reset Failed", description: "Could not reset theme preferences." });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isCheckingAuth || !initialValues) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6"> 
      <div className="flex items-center my-4 sm:my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
        </Button>
        <Palette className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          <span className="hidden sm:inline">Appearance Settings</span>
          <span className="sm:hidden">Appearance</span>
        </h1>
      </div>
      <Card className="w-full bg-card border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl md:text-2xl text-foreground">Customize Your Vibe</CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground pt-1">
            Choose your preferred theme mode, color palette, and UI scale. Changes are previewed live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8 pt-4">
          {/* Theme Mode Selection */}
          <div className="space-y-3">
            <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                <Palette className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-accent"/> Theme Mode
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
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
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
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 sm:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  <Moon className="mb-2 h-6 w-6 sm:h-7 sm:w-7" />
                  <span className="text-sm sm:text-base">Dark Mode</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* UI Scale Selection */}
          <div className="space-y-3">
            <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                <Ruler className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-accent"/> UI Scale
            </Label>
            <RadioGroup
              value={selectedUiScale}
              onValueChange={(value: string) => setSelectedUiScale(value as UiScale)}
              className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4"
            >
              {uiScaleOptions.map(opt => (
                <div key={opt.value}>
                  <RadioGroupItem value={opt.value} id={`scale-${opt.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`scale-${opt.value}`}
                    className={cn(
                      "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 sm:p-3 md:p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all text-xs sm:text-sm h-12 sm:h-14 md:h-16",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                    )}
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
             <CardDescription className="text-xs text-muted-foreground/80 pt-1">
                Adjusts the overall size of text and UI elements for readability.
            </CardDescription>
          </div>

          {/* Color Palette Selection */}
          <div className="space-y-3">
            <Label className="text-base sm:text-lg font-semibold text-foreground flex items-center">
                <Palette className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-accent"/> Color Palette
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {colorPalettes.map((palette) => (
                <Button
                  key={palette.name}
                  variant="outline"
                  onClick={() => setSelectedPalette(palette)}
                  className={cn(
                    "h-20 sm:h-24 w-full flex flex-col items-center justify-between border-2 p-2.5 sm:p-3 transition-all duration-200 ease-in-out relative",
                    selectedPalette.name === palette.name ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)] scale-105' : 'border-muted hover:border-foreground/50',
                    "focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  )}
                  style={{ borderColor: selectedPalette.name === palette.name ? `hsl(${palette.primary.value})` : undefined }}
                  aria-pressed={selectedPalette.name === palette.name}
                >
                  {/* Palette Preview */}
                  <div className="flex items-center justify-center w-full h-6 sm:h-8 mb-1.5 sm:mb-2">
                    <div className="flex space-x-1">
                      {palette.preview.colors.slice(0, 4).map((color, index) => (
                        <div 
                          key={index}
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-foreground/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Palette Info */}
                  <div className="text-center w-full">
                    <span className="font-semibold text-xs sm:text-sm text-foreground">{palette.name}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{palette.description}</p>
                  </div>
                  
                  {selectedPalette.name === palette.name && (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary absolute top-1.5 sm:top-2 right-1.5 sm:right-2" style={{ color: `hsl(${palette.primary.value})` }}/>
                  )}
                </Button>
              ))}
            </div>
            <CardDescription className="text-xs text-muted-foreground/80 pt-1">
                Each palette includes carefully curated primary and accent colors that work together harmoniously.
            </CardDescription>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:gap-4 pt-6 sm:pt-8 pb-4 sm:pb-6">
            <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive
                        shadow-[0_0_8px_hsl(var(--destructive)/0.3)] hover:shadow-[0_0_10px_hsl(var(--destructive)/0.5)]
                        transition-all duration-300 ease-in-out text-sm sm:text-base"
            >
                <RefreshCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4"/>
                Reset to Defaults
            </Button>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:flex-1 border-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground
                        shadow-[0_0_8px_hsl(var(--muted)/0.4)] hover:shadow-[0_0_12px_hsl(var(--muted)/0.6)]
                        transition-all duration-300 ease-in-out text-sm sm:text-base"
            >
                Cancel
            </Button>
            <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting || !currentUser}
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold
                        shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                        transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary text-sm sm:text-base"
            >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> }
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
