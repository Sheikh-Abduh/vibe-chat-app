
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState } from 'react';

interface LoadingContextType {
  isNavigationLoading: boolean;
  setIsNavigationLoading: Dispatch<SetStateAction<boolean>>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigationLoading, setIsNavigationLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ isNavigationLoading, setIsNavigationLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useAppLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useAppLoading must be used within a LoadingProvider');
  }
  return context;
}
