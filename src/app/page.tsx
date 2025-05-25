
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
      <div className="relative mb-2"> {/* Reduced margin-bottom from mb-4 */}
        <Image
          src="/logo.png"
          alt="vibe Logo"
          width={120} // Increased from 110
          height={120} // Increased from 110
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
          width={280} // Decreased from 300
          height={67}  // Decreased from 72 (maintaining aspect ratio)
          priority
          style={{
            filter: `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 20px hsl(var(--primary)/0.6)) drop-shadow(0 0 30px hsl(var(--accent)/0.4))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="mt-2 text-base text-muted-foreground">Initializing your vibe...</p> {/* Reduced margin-top, changed to text-base */}
    </div>
  );
}
