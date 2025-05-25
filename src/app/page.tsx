
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="relative mb-8">
        <Image
          src="/logo.png"
          alt="VibeCheck Logo"
          width={160}
          height={160}
          priority
          className="animate-pulse"
          style={{
            filter: `drop-shadow(0 0 12px hsl(var(--primary))) drop-shadow(0 0 6px hsl(var(--accent)/0.6))`
          }}
          data-ai-hint="abstract logo"
        />
      </div>
      <div className="relative">
        <Image
          src="/vibe.png"
          alt="VibeCheck"
          width={500}
          height={120}
          priority
          style={{
            filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 20px hsl(var(--primary)/0.7)) drop-shadow(0 0 30px hsl(var(--accent)/0.5))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="mt-8 text-lg text-muted-foreground">Initializing your vibe...</p>
    </div>
  );
}
