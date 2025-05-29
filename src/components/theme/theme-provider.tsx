
"use client";

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { doc, getDoc } from 'firebase/firestore'; // Firestore imports

// Default theme HSL variables (consistent with theme selection page and globals.css)
const defaultDarkVars: Record<string, string> = {
  '--background': '220 3% 10%', '--foreground': '0 0% 98%',
  '--card': '220 3% 12%', '--card-foreground': '0 0% 98%',
  '--popover': '220 3% 10%', '--popover-foreground': '0 0% 98%',
  '--secondary': '220 3% 18%', '--secondary-foreground': '0 0% 98%',
  '--muted': '220 3% 15%', '--muted-foreground': '0 0% 70%',
  '--border': '220 3% 18%', '--input': '220 3% 13%',
};

const defaultLightVars: Record<string, string> = {
  '--background': '0 0% 100%', '--foreground': '220 3% 10%',
  '--card': '0 0% 97%', '--card-foreground': '220 3% 10%',
  '--popover': '0 0% 100%', '--popover-foreground': '220 3% 10%',
  '--secondary': '0 0% 95%', '--secondary-foreground': '220 3% 10%',
  '--muted': '0 0% 90%', '--muted-foreground': '220 3% 25%',
  '--border': '0 0% 85%', '--input': '0 0% 92%',
};

const appDefaultPrimary = '289 85% 45%'; 
const appDefaultPrimaryFg = '0 0% 100%';
const appDefaultSecondaryAccent = '127 100% 43%'; 
const appDefaultSecondaryAccentFg = '220 3% 10%';
const appDefaultUiScale = 'default';

export type UiScale = 'compact' | 'default' | 'comfortable';

interface UserAppSettings {
  onboardingComplete?: boolean;
  themeMode?: 'light' | 'dark';
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
      const primaryAccent = settings?.themePrimaryAccent || appDefaultPrimary;
      const primaryAccentFg = settings?.themePrimaryAccentFg || appDefaultPrimaryFg;
      const secondaryAccent = settings?.themeSecondaryAccent || appDefaultSecondaryAccent;
      const secondaryAccentFg = settings?.themeSecondaryAccentFg || appDefaultSecondaryAccentFg;
      const uiScale = settings?.uiScale || appDefaultUiScale;

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
    if (currentUser) {
      const userDocRef = doc(db, "users", currentUser.uid);
      getDoc(userDocRef).then(userDocSnap => {
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          applyThemeFromSettings(data.appSettings as UserAppSettings || null);
        } else {
          // User document doesn't exist yet, apply app defaults
          applyThemeFromSettings(null);
        }
      }).catch(error => {
        console.error("Error fetching user settings from Firestore:", error);
        applyThemeFromSettings(null); // Fallback to defaults on error
      });
    } else {
      // No user logged in, apply app defaults
      applyThemeFromSettings(null);
    }
  }, [currentUser, applyThemeFromSettings]); 

  return <>{children}</>;
}
