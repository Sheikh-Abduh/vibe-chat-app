
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 overflow-hidden">
      <div className="relative mb-0"> {/* Logo container */}
        <Image
          src="/logo.png"
          alt="vibe Logo"
          width={120} 
          height={120} 
          priority
          className="animate-pulse"
          style={{
            filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 5px hsl(var(--accent)/0.6))`
          }}
          data-ai-hint="abstract logo"
        />
      </div>
      <div className="relative -mt-10"> {/* vibe.png container, moved further up */}
        <Image
          src="/vibe.png"
          alt="vibe text"
          width={180} 
          height={43}  
          priority
          style={{
            filter: `drop-shadow(0 0 8px hsl(var(--primary)/0.9)) drop-shadow(0 0 15px hsl(var(--primary)/0.5)) drop-shadow(0 0 25px hsl(var(--accent)/0.3))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="-mt-1 text-base text-muted-foreground">Initializing your vibe...</p> {/* Text brought even closer to vibe.png */}
    </div>
  );
}
