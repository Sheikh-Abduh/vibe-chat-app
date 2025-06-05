
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

interface AccentColorOption {
  name: string;
  value: string; 
  foreground: string; 
  className: string; 
}

const accentOptions: AccentColorOption[] = [
  { name: 'Neon Purple', value: '289 85% 55%', foreground: '0 0% 100%', className: 'bg-[hsl(289_85%_55%)]' }, // PRD Primary
  { name: 'Neon Green', value: '110 100% 50%', foreground: '220 3% 10%', className: 'bg-[hsl(110_100%_50%)]' }, // PRD Accent
  { name: 'Crimson Red', value: '348 83% 47%', foreground: '0 0% 100%', className: 'bg-[hsl(348_83%_47%)]' },
  { name: 'Electric Blue', value: '217 91% 59%', foreground: '0 0% 100%', className: 'bg-[hsl(217_91%_59%)]' },
  { name: 'Sunny Yellow', value: '45 100% 51%', foreground: '220 3% 10%', className: 'bg-[hsl(45_100%_51%)]' },
  { name: 'Emerald Green', value: '145 63% 42%', foreground: '0 0% 100%', className: 'bg-[hsl(145_63%_42%)]' },
  { name: 'Vibrant Orange', value: '24 95% 53%', foreground: '0 0% 100%', className: 'bg-[hsl(24_95%_53%)]'},
  // Forest Green was here, can be re-added if needed for more options. The PRD defines primary and accent, which are Neon Purple and Neon Green.
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

const prdPrimary = accentOptions.find(opt => opt.value === '289 85% 55%')!;
const prdAccent = accentOptions.find(opt => opt.value === '110 100% 50%')!;

const appDefaultTheme = {
    mode: 'dark' as ThemeMode,
    primary: prdPrimary,
    secondary: prdAccent, // Using PRD Neon Green as the default secondary accent
    scale: 'default' as UiScale,
};

interface UserAppSettings {
  themeMode?: ThemeMode;
  themePrimaryAccent?: string;
  themePrimaryAccentFg?: string;
  themeSecondaryAccent?: string;
  themeSecondaryAccentFg?: string;
  uiScale?: UiScale;
}


export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedMode, setSelectedMode] = useState<ThemeMode>(appDefaultTheme.mode);
  const [selectedPrimaryAccent, setSelectedPrimaryAccent] = useState<AccentColorOption>(appDefaultTheme.primary);
  const [selectedSecondaryAccent, setSelectedSecondaryAccent] = useState<AccentColorOption>(appDefaultTheme.secondary);
  const [selectedUiScale, setSelectedUiScale] = useState<UiScale>(appDefaultTheme.scale);

  const [initialValues, setInitialValues] = useState<UserAppSettings | null>(null);

  const applyThemeAndScale = useCallback((mode: ThemeMode, primary: AccentColorOption, secondary: AccentColorOption, scale: UiScale) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const themeVars = mode === 'dark' ? defaultDarkVars : defaultLightVars;

      for (const [key, value] of Object.entries(themeVars)) {
        root.style.setProperty(key, value);
      }
      root.style.setProperty('--primary', primary.value);
      root.style.setProperty('--primary-foreground', primary.foreground);
      root.style.setProperty('--ring', primary.value);
      root.style.setProperty('--accent', secondary.value);
      root.style.setProperty('--accent-foreground', secondary.foreground);

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
            themePrimaryAccent: appDefaultTheme.primary.value,
            themePrimaryAccentFg: appDefaultTheme.primary.foreground,
            themeSecondaryAccent: appDefaultTheme.secondary.value,
            themeSecondaryAccentFg: appDefaultTheme.secondary.foreground,
            uiScale: appDefaultTheme.scale,
        };

        if (userDocSnap.exists()) {
            const firestoreSettings = userDocSnap.data().appSettings as UserAppSettings | undefined;
            if (firestoreSettings) {
                loadedSettings = { ...loadedSettings, ...firestoreSettings };
            }
        }

        const currentPrimary = accentOptions.find(opt => opt.value === loadedSettings.themePrimaryAccent && opt.foreground === loadedSettings.themePrimaryAccentFg) || appDefaultTheme.primary;
        const currentSecondary = accentOptions.find(opt => opt.value === loadedSettings.themeSecondaryAccent && opt.foreground === loadedSettings.themeSecondaryAccentFg) || appDefaultTheme.secondary;
        
        setSelectedMode(loadedSettings.themeMode!);
        setSelectedPrimaryAccent(currentPrimary);
        setSelectedSecondaryAccent(currentSecondary);
        setSelectedUiScale(loadedSettings.uiScale!);
        
        setInitialValues({
            themeMode: loadedSettings.themeMode!,
            themePrimaryAccent: currentPrimary.value,
            themePrimaryAccentFg: currentPrimary.foreground,
            themeSecondaryAccent: currentSecondary.value,
            themeSecondaryAccentFg: currentSecondary.foreground,
            uiScale: loadedSettings.uiScale!,
        });
        applyThemeAndScale(loadedSettings.themeMode!, currentPrimary, currentSecondary, loadedSettings.uiScale!);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, applyThemeAndScale]);

  useEffect(() => {
    if (initialValues) { 
        applyThemeAndScale(selectedMode, selectedPrimaryAccent, selectedSecondaryAccent, selectedUiScale);
    }
  }, [selectedMode, selectedPrimaryAccent, selectedSecondaryAccent, selectedUiScale, applyThemeAndScale, initialValues]);

  useEffect(() => {
    return () => {
      if (initialValues && !isSubmitting && typeof window !== 'undefined') {
        const primary = accentOptions.find(opt => opt.value === initialValues.themePrimaryAccent && opt.foreground === initialValues.themePrimaryAccentFg) || appDefaultTheme.primary;
        const secondary = accentOptions.find(opt => opt.value === initialValues.themeSecondaryAccent && opt.foreground === initialValues.themeSecondaryAccentFg) || appDefaultTheme.secondary;
        applyThemeAndScale(initialValues.themeMode!, primary, secondary, initialValues.uiScale!);
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
        themePrimaryAccent: selectedPrimaryAccent.value,
        themePrimaryAccentFg: selectedPrimaryAccent.foreground,
        themeSecondaryAccent: selectedSecondaryAccent.value,
        themeSecondaryAccentFg: selectedSecondaryAccent.foreground,
        uiScale: selectedUiScale,
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
          description: "Your theme preferences have been updated.",
        });
        setInitialValues(newAppSettings); 
    } catch (error) {
        console.error("Error saving appearance settings to Firestore:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save appearance settings." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (initialValues) {
      const primary = accentOptions.find(opt => opt.value === initialValues.themePrimaryAccent && opt.foreground === initialValues.themePrimaryAccentFg) || appDefaultTheme.primary;
      const secondary = accentOptions.find(opt => opt.value === initialValues.themeSecondaryAccent && opt.foreground === initialValues.themeSecondaryAccentFg) || appDefaultTheme.secondary;
      applyThemeAndScale(initialValues.themeMode!, primary, secondary, initialValues.uiScale!);
      setSelectedMode(initialValues.themeMode!);
      setSelectedPrimaryAccent(primary);
      setSelectedSecondaryAccent(secondary);
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
        themePrimaryAccent: appDefaultTheme.primary.value,
        themePrimaryAccentFg: appDefaultTheme.primary.foreground,
        themeSecondaryAccent: appDefaultTheme.secondary.value,
        themeSecondaryAccentFg: appDefaultTheme.secondary.foreground,
        uiScale: appDefaultTheme.scale,
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
        setSelectedPrimaryAccent(appDefaultTheme.primary);
        setSelectedSecondaryAccent(appDefaultTheme.secondary);
        setSelectedUiScale(appDefaultTheme.scale);

        applyThemeAndScale(appDefaultTheme.mode, appDefaultTheme.primary, appDefaultTheme.secondary, appDefaultTheme.scale);
        setInitialValues(defaultSettings); 

        toast({
          title: "Settings Reset",
          description: "Appearance settings have been reset to default.",
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
    <div className="h-full overflow-y-auto overflow-x-hidden p-6"> 
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <Palette className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Appearance Settings
        </h1>
      </div>
      <Card className="w-full bg-card border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Customize Your Vibe</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Choose your preferred theme mode, accent colors, and UI scale. Changes are previewed live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-4">
          {/* Theme Mode Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
                <Palette className="mr-2 h-5 w-5 text-accent"/> Theme Mode
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
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  <Sun className="mb-2 h-7 w-7" /> Light Mode
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                  )}
                >
                  <Moon className="mb-2 h-7 w-7" /> Dark Mode
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* UI Scale Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
                <Ruler className="mr-2 h-5 w-5 text-accent"/> UI Scale
            </Label>
            <RadioGroup
              value={selectedUiScale}
              onValueChange={(value: string) => setSelectedUiScale(value as UiScale)}
              className="grid grid-cols-3 gap-4"
            >
              {uiScaleOptions.map(opt => (
                <div key={opt.value}>
                  <RadioGroupItem value={opt.value} id={`scale-${opt.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`scale-${opt.value}`}
                    className={cn(
                      "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all text-sm h-16",
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

          {/* Primary Accent Color Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
                <Palette className="mr-2 h-5 w-5 text-accent"/> Primary Accent Color
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {accentOptions.map((accent) => (
                <Button
                  key={`primary-${accent.name}`}
                  variant="outline"
                  onClick={() => setSelectedPrimaryAccent(accent)}
                  className={cn(
                    "h-20 w-full flex flex-col items-center justify-center border-2 p-2 transition-all duration-200 ease-in-out relative",
                    selectedPrimaryAccent.value === accent.value ? 'border-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)] scale-105' : 'border-muted hover:border-foreground/50',
                    "focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  )}
                  style={{ borderColor: selectedPrimaryAccent.value === accent.value ? `hsl(${accent.value})` : undefined }}
                  aria-pressed={selectedPrimaryAccent.value === accent.value}
                >
                  <div className={cn("h-8 w-8 rounded-full mb-2 border border-foreground/20", accent.className)} />
                  <span className="text-xs text-center text-muted-foreground">{accent.name}</span>
                  {selectedPrimaryAccent.value === accent.value && (
                    <CheckCircle className="h-5 w-5 text-primary absolute top-1 right-1" style={{ color: `hsl(${accent.value})` }}/>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Secondary Accent Color Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground flex items-center">
                 <Palette className="mr-2 h-5 w-5 text-accent"/> Secondary Accent Color
            </Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {accentOptions.map((accent) => (
                <Button
                  key={`secondary-${accent.name}`}
                  variant="outline"
                  onClick={() => setSelectedSecondaryAccent(accent)}
                  className={cn(
                    "h-20 w-full flex flex-col items-center justify-center border-2 p-2 transition-all duration-200 ease-in-out relative",
                    selectedSecondaryAccent.value === accent.value ? 'border-accent shadow-[0_0_10px_hsl(var(--accent)/0.7)] scale-105' : 'border-muted hover:border-foreground/50',
                    "focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                  )}
                   style={{ borderColor: selectedSecondaryAccent.value === accent.value ? `hsl(${accent.value})` : undefined }}
                   aria-pressed={selectedSecondaryAccent.value === accent.value}
                >
                  <div className={cn("h-8 w-8 rounded-full mb-2 border border-foreground/20", accent.className)} />
                  <span className="text-xs text-center text-muted-foreground">{accent.name}</span>
                   {selectedSecondaryAccent.value === accent.value && (
                    <CheckCircle className="h-5 w-5 text-accent absolute top-1 right-1" style={{ color: `hsl(${accent.value})` }}/>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-8 pb-6">
            <Button
                variant="outline"
                onClick={handleResetToDefaults}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive
                        shadow-[0_0_8px_hsl(var(--destructive)/0.3)] hover:shadow-[0_0_10px_hsl(var(--destructive)/0.5)]
                        transition-all duration-300 ease-in-out"
            >
                <RefreshCcw className="mr-2 h-4 w-4"/>
                Reset to Defaults
            </Button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto border-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground
                        shadow-[0_0_8px_hsl(var(--muted)/0.4)] hover:shadow-[0_0_12px_hsl(var(--muted)/0.6)]
                        transition-all duration-300 ease-in-out"
            >
                Cancel
            </Button>
            <Button
                onClick={handleSaveChanges}
                disabled={isSubmitting || !currentUser}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold
                        shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                        transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
            >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" /> }
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
