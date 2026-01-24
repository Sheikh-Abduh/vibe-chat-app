"use client";

import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';

export default function DatabaseConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    
    const unsubscribe = onValue(connectedRef, (snap) => {
      setIsConnected(!!snap.val());
    });

    return () => unsubscribe();
  }, []);

  if (isConnected === null) return null;

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-full text-sm 
      ${isConnected 
        ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
        : 'bg-red-500/10 text-red-500 border border-red-500/20'
      }`}>
      {isConnected ? '🟢 Call System Online' : '🔴 Call System Offline'}
    </div>
  );
}
