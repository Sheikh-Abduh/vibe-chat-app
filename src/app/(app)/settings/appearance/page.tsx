
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Sun, Moon, Palette, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { cn } from '@/lib/utils';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import Link from 'next/link';

type ThemeMode = 'light' | 'dark';

interface AccentColorOption {
  name: string;
  value: string; // HSL string for main color
  foreground: string; // HSL string for foreground color
  className: string; // Tailwind class for bg color of swatch
}

// Shared accent options for primary and secondary
const accentOptions: AccentColorOption[] = [
  { name: 'Neon Purple', value: '289 85% 45%', foreground: '0 0% 100%', className: 'bg-[hsl(289_85%_45%)]' },
  { name: 'Crimson Red', value: '348 83% 47%', foreground: '0 0% 100%', className: 'bg-[hsl(348_83%_47%)]' },
  { name: 'Electric Blue', value: '217 91% 59%', foreground: '0 0% 100%', className: 'bg-[hsl(217_91%_59%)]' },
  { name: 'Sunny Yellow', value: '45 100% 51%', foreground: '220 3% 10%', className: 'bg-[hsl(45_100%_51%)]' },
  { name: 'Emerald Green', value: '145 63% 42%', foreground: '0 0% 100%', className: 'bg-[hsl(145_63%_42%)]' },
  { name: 'Vibrant Orange', value: '24 95% 53%', foreground: '0 0% 100%', className: 'bg-[hsl(24_95%_53%)]'},
  { name: 'Forest Green', value: '127 100% 43%', foreground: '220 3% 10%', className: 'bg-[hsl(127_100%_43%)]' }, // Original Accent
];

// Default theme values (consistent with globals.css and onboarding/theme)
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

export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedMode, setSelectedMode] = useState<ThemeMode>('dark');
  const [selectedPrimaryAccent, setSelectedPrimaryAccent] = useState<AccentColorOption>(accentOptions[0]);
  const [selectedSecondaryAccent, setSelectedSecondaryAccent] = useState<AccentColorOption>(accentOptions[6]); // Default to Forest Green

  // Store initial values to revert if user navigates away without saving
  const [initialValues, setInitialValues] = useState<{
    mode: ThemeMode;
    primary: AccentColorOption;
    secondary: AccentColorOption;
  } | null>(null);

  const applyTheme = useCallback((mode: ThemeMode, primary: AccentColorOption, secondary: AccentColorOption) => {
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
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const savedMode = localStorage.getItem(`theme_mode_${user.uid}`) as ThemeMode | null;
        const savedPrimaryAccentValue = localStorage.getItem(`theme_accent_primary_${user.uid}`);
        const savedPrimaryAccentFgValue = localStorage.getItem(`theme_accent_primary_fg_${user.uid}`);
        const savedSecondaryAccentValue = localStorage.getItem(`theme_accent_secondary_${user.uid}`);
        const savedSecondaryAccentFgValue = localStorage.getItem(`theme_accent_secondary_fg_${user.uid}`);

        const currentMode = savedMode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        const currentPrimary = accentOptions.find(opt => opt.value === savedPrimaryAccentValue && opt.foreground === savedPrimaryAccentFgValue) || accentOptions[0];
        const currentSecondary = accentOptions.find(opt => opt.value === savedSecondaryAccentValue && opt.foreground === savedSecondaryAccentFgValue) || accentOptions[6];

        setSelectedMode(currentMode);
        setSelectedPrimaryAccent(currentPrimary);
        setSelectedSecondaryAccent(currentSecondary);
        
        setInitialValues({ mode: currentMode, primary: currentPrimary, secondary: currentSecondary });
        applyTheme(currentMode, currentPrimary, currentSecondary); // Apply loaded or default theme initially
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, applyTheme]);

  // Live preview effect
  useEffect(() => {
    if (initialValues) { // Only apply if initial values are set (meaning user data is loaded)
        applyTheme(selectedMode, selectedPrimaryAccent, selectedSecondaryAccent);
    }
  }, [selectedMode, selectedPrimaryAccent, selectedSecondaryAccent, applyTheme, initialValues]);

  // Revert to initial theme if component unmounts and changes weren't saved
  useEffect(() => {
    return () => {
      if (initialValues && !isSubmitting) { // isSubmitting check to prevent revert during save navigation
        applyTheme(initialValues.mode, initialValues.primary, initialValues.secondary);
      }
    };
  }, [initialValues, isSubmitting, applyTheme]);


  const handleSaveChanges = () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    localStorage.setItem(`theme_mode_${currentUser.uid}`, selectedMode);
    localStorage.setItem(`theme_accent_primary_${currentUser.uid}`, selectedPrimaryAccent.value);
    localStorage.setItem(`theme_accent_primary_fg_${currentUser.uid}`, selectedPrimaryAccent.foreground);
    localStorage.setItem(`theme_accent_secondary_${currentUser.uid}`, selectedSecondaryAccent.value);
    localStorage.setItem(`theme_accent_secondary_fg_${currentUser.uid}`, selectedSecondaryAccent.foreground);

    toast({
      title: "Appearance Settings Saved!",
      description: "Your theme preferences have been updated.",
    });
    
    // Update initialValues to reflect saved changes so revert doesn't happen
    setInitialValues({ mode: selectedMode, primary: selectedPrimaryAccent, secondary: selectedSecondaryAccent });

    // No need to navigate away immediately, user might want to see changes
    setTimeout(() => {
        setIsSubmitting(false);
    }, 500); 
  };
  
  const handleCancel = () => {
    if (initialValues) {
      applyTheme(initialValues.mode, initialValues.primary, initialValues.secondary);
      setSelectedMode(initialValues.mode);
      setSelectedPrimaryAccent(initialValues.primary);
      setSelectedSecondaryAccent(initialValues.secondary);
    }
    router.push('/settings');
  };

  if (isCheckingAuth || !initialValues) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-5 w-5" />
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
            Choose your preferred theme mode and accent colors. Changes are previewed live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-4">
          {/* Theme Mode Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground">Theme Mode</Label>
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

          {/* Primary Accent Color Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold text-foreground">Primary Accent Color</Label>
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
            <Label className="text-lg font-semibold text-foreground">Secondary Accent Color</Label>
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
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-8 pb-6">
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
        </CardFooter>
      </Card>
    </div>
  );
}
