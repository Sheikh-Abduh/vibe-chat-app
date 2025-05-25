"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Waves } from 'lucide-react'; // Using Waves for an "edgy" vibe icon

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
        <Waves
          className="h-32 w-32 text-primary animate-pulse"
          style={{ filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 5px hsl(var(--accent)/0.5))` }}
        />
      </div>
      <h1
        className="text-5xl md:text-7xl font-bold tracking-tighter"
        style={{
          textShadow: '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary)/0.7), 0 0 24px hsl(var(--accent)/0.5)',
        }}
      >
        VibeCheck
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">Initializing your vibe...</p>
    </div>
  );
}
