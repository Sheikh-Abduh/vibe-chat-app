
import Image from 'next/image';

export default function SplashScreenDisplay() {
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
            filter: `drop-shadow(0 0 10px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))`
          }}
          data-ai-hint="abstract logo"
        />
      </div>
      <div className="relative -mt-[64px]"> {/* vibe.png container */}
        <Image
          src="/vibe.png"
          alt="vibe text"
          width={180} 
          height={43}  
          priority
          style={{
            filter: `drop-shadow(0 0 8px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 15px rgba(255, 255, 255, 0.3)) drop-shadow(0 0 25px rgba(255, 255, 255, 0.2))`
          }}
          data-ai-hint="typography wordmark"
        />
      </div>
      <p className="-mt-[52px] text-base text-muted-foreground">Initializing your vibe...</p>
    </div>
  );
}
