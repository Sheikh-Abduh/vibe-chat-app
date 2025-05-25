
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
      <div className="relative mb-6">
        <Image
          src="/logo.png"
          alt="vibe Logo"
          width={100} // Changed from 120 to 100
          height={100} // Changed from 120 to 100
          priority
          className="animate-pulse"
          style={{
            filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 5px hsl(var(--accent)/0.6))`
          }}
          data-ai-hint="abstract logo"
        />
      </div>
      <div className="relative">
        <Image
          src="/vibe.png"
          alt="vibe text"
          width={333} // Changed from 400
          height={80}  // Changed from 96
          priority
          style={{
            filter: `drop-shadow(0 0 8px hsl(var(--primary))) drop-shadow(0 0 16px hsl(var(--primary)/0.7)) drop-shadow(0 0 24px hsl(var(--accent)/0.5))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="mt-6 text-lg text-muted-foreground">Initializing your vibe...</p>
    </div>
  );
}
