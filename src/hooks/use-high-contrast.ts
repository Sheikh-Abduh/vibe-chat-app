"use client";

import { useEffect, useState } from 'react';

/**
 * Custom hook for detecting and managing high contrast mode
 * Provides accessibility support for users who need high contrast visuals
 */
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Check for system high contrast preference
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const windowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // Check for forced colors (Windows high contrast mode)
      const forcedColors = window.matchMedia('(forced-colors: active)').matches;
      
      // Check for user preference in localStorage
      const userPreference = localStorage.getItem('high-contrast-mode') === 'true';
      
      setIsHighContrast(windowsHighContrast || forcedColors || userPreference);
    };

    // Initial check
    checkHighContrast();

    // Listen for changes in system preferences
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    
    const handleChange = () => checkHighContrast();
    
    contrastQuery.addEventListener('change', handleChange);
    forcedColorsQuery.addEventListener('change', handleChange);

    // Listen for storage changes (user preference changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'high-contrast-mode') {
        checkHighContrast();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      contrastQuery.removeEventListener('change', handleChange);
      forcedColorsQuery.removeEventListener('change', handleChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('high-contrast-mode', newValue.toString());
  };

  return {
    isHighContrast,
    toggleHighContrast
  };
};