import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from 'react';
import Image from 'next/image';

interface AuthFormWrapperProps {
  title: string;
  description: string;
  children: ReactNode;
  footerContent: ReactNode;
}

export function AuthFormWrapper({ title, description, children, footerContent }: AuthFormWrapperProps) {
  return (
    <Card className="w-full max-w-md bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
      <div className="flex justify-center pt-4 pb-0"> {/* Reduced pt from 6 to 4, pb from 2 to 0 */}
        <Image
          src="/logo.png"
          alt="Vibe Logo"
          width={100} 
          height={100}
          priority
          style={{
            filter: `drop-shadow(0 0 8px hsl(var(--primary)/0.8)) drop-shadow(0 0 4px hsl(var(--accent)/0.5))`
          }}
          data-ai-hint="abstract logo"
        />
      </div>
      <CardHeader className="text-center pt-0 pb-4"> {/* Explicitly set pb to 4, default CardHeader p-6 */}
        <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>{title}</CardTitle>
        <CardDescription className="text-muted-foreground pt-1">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter className="flex justify-center">
        {footerContent}
      </CardFooter>
    </Card>
  );
}
