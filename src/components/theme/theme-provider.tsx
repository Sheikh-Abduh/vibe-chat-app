
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Default theme HSL variables (consistent with theme selection page)
const defaultDarkVars: Record<string, string> = {
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

const defaultLightVars: Record<string, string> = {
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      const root = document.documentElement;
      
      const savedMode = localStorage.getItem(`theme_mode_${currentUser.uid}`) as 'light' | 'dark' | null;
      const savedAccentPrimary = localStorage.getItem(`theme_accent_primary_${currentUser.uid}`);
      const savedAccentPrimaryFg = localStorage.getItem(`theme_accent_primary_fg_${currentUser.uid}`);

      if (savedMode) {
        // Apply base theme variables (light/dark)
        const themeVars = savedMode === 'dark' ? defaultDarkVars : defaultLightVars;
        for (const [key, value] of Object.entries(themeVars)) {
          root.style.setProperty(key, value);
        }
      }

      if (savedAccentPrimary) {
        root.style.setProperty('--primary', savedAccentPrimary);
        root.style.setProperty('--ring', savedAccentPrimary); // Ring color often matches primary
      }
      if (savedAccentPrimaryFg) {
        root.style.setProperty('--primary-foreground', savedAccentPrimaryFg);
      }
      
      // If no saved theme, globals.css defaults will apply
    }
  }, [currentUser]);

  return <>{children}</>;
}
