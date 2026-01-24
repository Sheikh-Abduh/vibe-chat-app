"use client";

import { create } from 'zustand';
import type { CallSignal } from '@/hooks/useCallSignaling';
import type { StateCreator } from 'zustand';

interface CallState {
  // Current call state
  incomingCall: { signal: CallSignal; callId: string } | null;
  isInCall: boolean;
  currentCallId: string | null;
  callType: 'audio' | 'video' | null;
  callerInfo: {
    uid: string;
    name: string;
    avatar: string | null;
  } | null;

  // Actions
  setIncomingCall: (call: { signal: CallSignal; callId: string } | null) => void;
  setIsInCall: (isInCall: boolean) => void;
  setCurrentCallId: (callId: string | null) => void;
  setCallType: (type: 'audio' | 'video' | null) => void;
  setCallerInfo: (info: { uid: string; name: string; avatar: string | null } | null) => void;
  
  // Reset state
  resetState: () => void;
}

const initialState: Omit<CallState, 'setIncomingCall' | 'setIsInCall' | 'setCurrentCallId' | 'setCallType' | 'setCallerInfo' | 'resetState'> = {
  incomingCall: null,
  isInCall: false,
  currentCallId: null,
  callType: null,
  callerInfo: null,
};

export const useCallStore = create<CallState>((set: any) => ({
  ...initialState,

  // Actions
  setIncomingCall: (call: { signal: CallSignal; callId: string } | null) => {
    console.log('🏪 [CallStore] Setting incoming call:', call);
    set({ incomingCall: call });
  },
  setIsInCall: (isInCall: boolean) => {
    console.log('🏪 [CallStore] Setting isInCall:', isInCall);
    set({ isInCall });
  },
  setCurrentCallId: (callId: string | null) => {
    console.log('🏪 [CallStore] Setting currentCallId:', callId);
    set({ currentCallId: callId });
  },
  setCallType: (type: 'audio' | 'video' | null) => {
    console.log('🏪 [CallStore] Setting callType:', type);
    set({ callType: type });
  },
  setCallerInfo: (info: { uid: string; name: string; avatar: string | null } | null) => {
    console.log('🏪 [CallStore] Setting caller info:', info);
    set({ callerInfo: info });
  },
  
  // Reset state
  resetState: () => {
    console.log('🏪 [CallStore] Resetting state');
    set(initialState);
  },
}));
