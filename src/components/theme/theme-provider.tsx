
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Default theme HSL variables (consistent with theme selection page)
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
    if (typeof window !== 'undefined') { // Ensure this runs only on client
      const root = document.documentElement;
      
      const applyUserThemeAndScale = (user: User | null) => {
        const savedMode = user ? localStorage.getItem(`theme_mode_${user.uid}`) as 'light' | 'dark' | null : null;
        const savedPrimaryAccent = user ? localStorage.getItem(`theme_accent_primary_${user.uid}`) : null;
        const savedPrimaryAccentFg = user ? localStorage.getItem(`theme_accent_primary_fg_${user.uid}`) : null;
        const savedSecondaryAccent = user ? localStorage.getItem(`theme_accent_secondary_${user.uid}`) : null;
        const savedSecondaryAccentFg = user ? localStorage.getItem(`theme_accent_secondary_fg_${user.uid}`) : null;
        const savedUiScale = user ? localStorage.getItem(`ui_scale_${user.uid}`) as UiScale | null : null;

        // Determine mode: saved user preference > system preference > default (dark)
        let activeMode: 'light' | 'dark' = 'dark'; // Default to dark
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
          root.style.removeProperty('--primary'); 
          root.style.removeProperty('--ring');
        }
        if (savedPrimaryAccentFg) {
          root.style.setProperty('--primary-foreground', savedPrimaryAccentFg);
        } else {
           root.style.removeProperty('--primary-foreground');
        }

        if (savedSecondaryAccent) {
          root.style.setProperty('--accent', savedSecondaryAccent);
        } else {
          root.style.removeProperty('--accent');
        }
        if (savedSecondaryAccentFg) {
          root.style.setProperty('--accent-foreground', savedSecondaryAccentFg);
        } else {
          root.style.removeProperty('--accent-foreground');
        }

        // Apply UI Scale
        root.classList.remove('ui-scale-compact', 'ui-scale-default', 'ui-scale-comfortable');
        if (savedUiScale) {
          root.classList.add(`ui-scale-${savedUiScale}`);
        } else {
          root.classList.add('ui-scale-default'); // Fallback to default if nothing saved
        }
      };

      applyUserThemeAndScale(currentUser); 

    }
  }, [currentUser]); 

  return <>{children}</>;
}
