
"use client";

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { doc, getDoc } from 'firebase/firestore'; // Firestore imports

// Default theme HSL variables (consistent with theme selection page and globals.css)
// Default theme HSL variables (consistent with theme selection page and globals.css)
const defaultDarkVars: Record<string, string> = {
  '--background': '240 10% 4%', '--foreground': '0 0% 98%',
  '--card': '240 10% 6%', '--card-foreground': '0 0% 98%',
  '--popover': '240 10% 6%', '--popover-foreground': '0 0% 98%',
  '--secondary': '240 5% 15%', '--secondary-foreground': '0 0% 98%',
  '--muted': '240 5% 15%', '--muted-foreground': '240 5% 65%',
  '--border': '240 5% 15%', '--input': '240 5% 15%',
};

const defaultLightVars: Record<string, string> = {
  '--background': '0 0% 100%', '--foreground': '240 10% 4%',
  '--card': '0 0% 97%', '--card-foreground': '240 10% 4%',
  '--popover': '0 0% 100%', '--popover-foreground': '240 10% 4%',
  '--secondary': '240 5% 96%', '--secondary-foreground': '240 10% 4%',
  '--muted': '240 5% 96%', '--muted-foreground': '240 5% 45%',
  '--border': '240 5% 90%', '--input': '240 5% 90%',
};

// Default color palettes - same as in appearance settings
interface ColorPalette {
  name: string;
  primary: { value: string; foreground: string; };
  secondary: { value: string; foreground: string; };
}

const colorPalettes: ColorPalette[] = [
  {
    name: 'Vibe', // New Default
    primary: { value: '289 85% 55%', foreground: '0 0% 100%' }, // Electric Purple
    secondary: { value: '110 100% 50%', foreground: '240 10% 4%' } // Neon Green
  },
  {
    name: 'Nebula',
    primary: { value: '250 84% 54%', foreground: '0 0% 100%' },
    secondary: { value: '180 100% 50%', foreground: '220 26% 14%' }
  },
  {
    name: 'Solaris',
    primary: { value: '35 91% 58%', foreground: '0 0% 100%' },
    secondary: { value: '16 90% 66%', foreground: '0 0% 100%' }
  },
  {
    name: 'Obsidian',
    primary: { value: '200 6% 10%', foreground: '120 100% 50%' },
    secondary: { value: '195 100% 50%', foreground: '200 6% 10%' }
  },
  {
    name: 'Aurora',
    primary: { value: '300 76% 72%', foreground: '0 0% 100%' },
    secondary: { value: '180 100% 50%', foreground: '0 0% 100%' }
  },
  {
    name: 'Pulse',
    primary: { value: '217 91% 59%', foreground: '0 0% 100%' },
    secondary: { value: '150 100% 66%', foreground: '220 3% 10%' }
  }
];

const defaultPalette = colorPalettes[0]; // Vibe

// Legacy defaults for backward compatibility
const appDefaultPrimary = defaultPalette.primary.value;
const appDefaultPrimaryFg = defaultPalette.primary.foreground;
const appDefaultSecondaryAccent = defaultPalette.secondary.value;
const appDefaultSecondaryAccentFg = defaultPalette.secondary.foreground;
const appDefaultUiScale = 'default';

export type UiScale = 'compact' | 'default' | 'comfortable';

interface UserAppSettings {
  onboardingComplete?: boolean;
  themeMode?: 'light' | 'dark';
  // New palette system
  colorPalette?: string;
  // Legacy individual color settings (for backward compatibility)
  themePrimaryAccent?: string;
  themePrimaryAccentFg?: string;
  themeSecondaryAccent?: string;
  themeSecondaryAccentFg?: string;
  uiScale?: UiScale;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const applyThemeFromSettings = useCallback((settings: UserAppSettings | null) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      const mode = settings?.themeMode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      const uiScale = settings?.uiScale || appDefaultUiScale;

      // Determine colors to use
      let primaryAccent = appDefaultPrimary;
      let primaryAccentFg = appDefaultPrimaryFg;
      let secondaryAccent = appDefaultSecondaryAccent;
      let secondaryAccentFg = appDefaultSecondaryAccentFg;

      if (settings?.colorPalette) {
        // New palette system
        const palette = colorPalettes.find(p => p.name === settings.colorPalette) || defaultPalette;
        primaryAccent = palette.primary.value;
        primaryAccentFg = palette.primary.foreground;
        secondaryAccent = palette.secondary.value;
        secondaryAccentFg = palette.secondary.foreground;
      } else if (settings?.themePrimaryAccent && settings?.themeSecondaryAccent) {
        // Legacy individual color system
        primaryAccent = settings.themePrimaryAccent;
        primaryAccentFg = settings.themePrimaryAccentFg || appDefaultPrimaryFg;
        secondaryAccent = settings.themeSecondaryAccent;
        secondaryAccentFg = settings.themeSecondaryAccentFg || appDefaultSecondaryAccentFg;
      }

      const baseVarsToApply = mode === 'light' ? defaultLightVars : defaultDarkVars;

      for (const [key, value] of Object.entries(baseVarsToApply)) {
        root.style.setProperty(key, value);
      }
      root.style.setProperty('--primary', primaryAccent);
      root.style.setProperty('--primary-foreground', primaryAccentFg);
      root.style.setProperty('--ring', primaryAccent);
      root.style.setProperty('--accent', secondaryAccent);
      root.style.setProperty('--accent-foreground', secondaryAccentFg);

      root.classList.remove('ui-scale-compact', 'ui-scale-default', 'ui-scale-comfortable');
      root.classList.add(`ui-scale-${uiScale}`);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      getDoc(userDocRef).then(userDocSnap => {
        if (!isMounted) return;
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          applyThemeFromSettings(data.appSettings as UserAppSettings || null);
        } else {
          applyThemeFromSettings(null);
        }
      }).catch(error => {
        if (!isMounted) return;
        console.error("Error fetching user settings from Firestore:", error);
        applyThemeFromSettings(null);
      });
    } else {
      applyThemeFromSettings(null);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser, applyThemeFromSettings]);

  return <>{children}</>;
}

