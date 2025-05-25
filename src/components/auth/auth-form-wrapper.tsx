import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from 'react';

interface AuthFormWrapperProps {
  title: string;
  description: string;
  children: ReactNode;
  footerContent: ReactNode;
}

export function AuthFormWrapper({ title, description, children, footerContent }: AuthFormWrapperProps) {
  return (
    <Card className="w-full max-w-md bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
      <CardHeader className="text-center">
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
