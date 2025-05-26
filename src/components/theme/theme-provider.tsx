
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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

// These should match the initial defaults from globals.css or your desired app defaults
const appDefaultPrimary = '289 85% 45%'; // Neon Purple
const appDefaultPrimaryFg = '0 0% 100%';
const appDefaultSecondary = '127 100% 43%'; // Forest Green (used as initial --accent)
const appDefaultSecondaryFg = '220 3% 10%';
const appDefaultUiScale = 'default';

export type UiScale = 'compact' | 'default' | 'comfortable';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') { 
      const root = document.documentElement;
      
      if (!currentUser) {
        // Apply app defaults if no user is logged in
        const systemPrefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        const baseVarsToApply = systemPrefersLight ? defaultLightVars : defaultDarkVars;
        
        for (const [key, value] of Object.entries(baseVarsToApply)) {
          root.style.setProperty(key, value);
        }
        root.style.setProperty('--primary', appDefaultPrimary);
        root.style.setProperty('--primary-foreground', appDefaultPrimaryFg);
        root.style.setProperty('--ring', appDefaultPrimary);
        root.style.setProperty('--accent', appDefaultSecondary);
        root.style.setProperty('--accent-foreground', appDefaultSecondaryFg);

        root.classList.remove('ui-scale-compact', 'ui-scale-default', 'ui-scale-comfortable');
        root.classList.add(`ui-scale-${appDefaultUiScale}`);
        return;
      }

      // User is logged in, try to apply their saved settings
      const savedMode = localStorage.getItem(`theme_mode_${currentUser.uid}`) as 'light' | 'dark' | null;
      const savedPrimaryAccent = localStorage.getItem(`theme_accent_primary_${currentUser.uid}`);
      const savedPrimaryAccentFg = localStorage.getItem(`theme_accent_primary_fg_${currentUser.uid}`);
      const savedSecondaryAccent = localStorage.getItem(`theme_accent_secondary_${currentUser.uid}`);
      const savedSecondaryAccentFg = localStorage.getItem(`theme_accent_secondary_fg_${currentUser.uid}`);
      const savedUiScale = localStorage.getItem(`ui_scale_${currentUser.uid}`) as UiScale | null;

      let activeMode: 'light' | 'dark' = defaultDarkVars['--background'].includes('100%') ? 'light' : 'dark'; // Determine default based on CSS
      if (savedMode) {
        activeMode = savedMode;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        activeMode = 'light';
      }
      
      const themeVars = activeMode === 'dark' ? defaultDarkVars : defaultLightVars;
      for (const [key, value] of Object.entries(themeVars)) {
        root.style.setProperty(key, value);
      }

      if (savedPrimaryAccent) {
        root.style.setProperty('--primary', savedPrimaryAccent);
        root.style.setProperty('--ring', savedPrimaryAccent); 
      } else {
        root.style.setProperty('--primary', appDefaultPrimary); // Fallback to app default
        root.style.setProperty('--ring', appDefaultPrimary);
      }
      if (savedPrimaryAccentFg) {
        root.style.setProperty('--primary-foreground', savedPrimaryAccentFg);
      } else {
        root.style.setProperty('--primary-foreground', appDefaultPrimaryFg); // Fallback
      }

      if (savedSecondaryAccent) {
        root.style.setProperty('--accent', savedSecondaryAccent);
      } else {
        root.style.setProperty('--accent', appDefaultSecondary); // Fallback
      }
      if (savedSecondaryAccentFg) {
        root.style.setProperty('--accent-foreground', savedSecondaryAccentFg);
      } else {
        root.style.setProperty('--accent-foreground', appDefaultSecondaryFg); // Fallback
      }

      root.classList.remove('ui-scale-compact', 'ui-scale-default', 'ui-scale-comfortable');
      root.classList.add(`ui-scale-${savedUiScale || appDefaultUiScale}`);
    }
  }, [currentUser]); 

  return <>{children}</>;
}
