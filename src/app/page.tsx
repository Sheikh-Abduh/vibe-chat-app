
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
      <div className="relative mb-4"> {/* Reduced margin-bottom from mb-6 */}
        <Image
          src="/logo.png"
          alt="vibe Logo"
          width={110} // Increased from 100
          height={110} // Increased from 100
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
          width={300} // Decreased from 333
          height={72}  // Decreased from 80
          priority
          style={{
            filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 20px hsl(var(--primary)/0.6)) drop-shadow(0 0 30px hsl(var(--accent)/0.4))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="mt-4 text-lg text-muted-foreground">Initializing your vibe...</p> {/* Reduced margin-top from mt-6 */}
    </div>
  );
}
