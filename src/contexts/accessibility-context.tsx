"use client";

import React, { createContext, useContext, useRef, useCallback } from 'react';

interface AccessibilityContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceCallStatus: (status: string, participant?: string) => void;
  announceControlChange: (control: string, state: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const politeAnnouncerRef = useRef<HTMLDivElement>(null);
  const assertiveAnnouncerRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = priority === 'assertive' ? assertiveAnnouncerRef.current : politeAnnouncerRef.current;
    
    if (announcer) {
      // Clear previous message
      announcer.textContent = '';
      
      // Add new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
      
      // Clear message after announcement to avoid repetition
      setTimeout(() => {
        announcer.textContent = '';
      }, 3000);
    }
  }, []);

  const announceCallStatus = useCallback((status: string, participant?: string) => {
    let message = '';
    
    switch (status) {
      case 'connected':
        message = participant 
          ? `Call connected with ${participant}` 
          : 'Call connected';
        break;
      case 'connecting':
        message = participant 
          ? `Connecting to ${participant}` 
          : 'Connecting to call';
        break;
      case 'ended':
        message = 'Call ended';
        break;
      case 'speaking':
        message = participant 
          ? `${participant} is speaking` 
          : 'Speaking detected';
        break;
      case 'stopped-speaking':
        message = participant 
          ? `${participant} stopped speaking` 
          : 'Speaking stopped';
        break;
      default:
        message = `Call status: ${status}`;
    }
    
    announce(message, 'polite');
  }, [announce]);

  const announceControlChange = useCallback((control: string, state: string) => {
    let message = '';
    
    switch (control) {
      case 'mute':
        message = state === 'muted' ? 'Microphone muted' : 'Microphone unmuted';
        break;
      case 'video':
        message = state === 'off' ? 'Camera turned off' : 'Camera turned on';
        break;
      case 'screenshare':
        message = state === 'started' ? 'Screen sharing started' : 'Screen sharing stopped';
        break;
      default:
        message = `${control} ${state}`;
    }
    
    announce(message, 'assertive');
  }, [announce]);

  return (
    <AccessibilityContext.Provider value={{
      announce,
      announceCallStatus,
      announceControlChange
    }}>
      {children}
      
      {/* Screen reader announcement regions */}
      <div
        ref={politeAnnouncerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      <div
        ref={assertiveAnnouncerRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      />
    </AccessibilityContext.Provider>
  );
};