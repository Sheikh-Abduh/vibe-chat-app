"use client";

import { callSessionManager } from './call-session';

/**
 * Utility functions for call routing and navigation
 */

export interface CallRoutingOptions {
  callId: string;
  participants: string[];
  type?: 'voice' | 'video';
  returnPath?: string;
}

/**
 * Navigate to dedicated call screen
 */
export function navigateToCall(options: CallRoutingOptions): void {
  const { callId, participants, type = 'voice', returnPath } = options;
  
  if (!callId || participants.length === 0) {
    console.error('Invalid call routing options:', options);
    return;
  }

  callSessionManager.redirectToCall(callId, participants, type, returnPath);
}

/**
 * Navigate away from call screen
 */
export function navigateFromCall(returnPath?: string): void {
  callSessionManager.redirectFromCall(returnPath);
}

/**
 * Check if currently on a call page
 */
export function isOnCallPage(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/call/');
}

/**
 * Get current call ID from URL if on call page
 */
export function getCurrentCallId(): string | null {
  if (!isOnCallPage()) return null;
  
  const pathParts = window.location.pathname.split('/');
  const callIndex = pathParts.indexOf('call');
  
  if (callIndex !== -1 && pathParts[callIndex + 1]) {
    return pathParts[callIndex + 1];
  }
  
  return null;
}

/**
 * Build call URL with parameters
 */
export function buildCallUrl(callId: string, participants: string[], type: 'voice' | 'video' = 'voice', returnPath?: string): string {
  const params = new URLSearchParams({
    type,
    participants: participants.join(','),
    ...(returnPath && { returnPath })
  });

  return `/call/${callId}?${params.toString()}`;
}

/**
 * Parse call parameters from URL search params
 */
export function parseCallParams(searchParams: URLSearchParams): {
  type: 'voice' | 'video';
  participants: string[];
  returnPath: string;
} {
  const type = (searchParams.get('type') as 'voice' | 'video') || 'voice';
  const participants = searchParams.get('participants')?.split(',') || [];
  const returnPath = searchParams.get('returnPath') || '/messages';

  return { type, participants, returnPath };
}