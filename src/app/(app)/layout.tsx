
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          setIsCheckingAuth(false); // User is authenticated and onboarded
        } else {
          router.replace('/onboarding/avatar'); // Start or resume onboarding
        }
      } else {
        router.replace('/login'); // No user, redirect to login
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null); // Clear local user state
      // Clear any user-specific localStorage items if needed
      // Example: localStorage.removeItem(`onboardingComplete_${currentUser?.uid}`);
      // (Be cautious with mass removal unless sure)
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
    }
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser) {
    // This case should ideally be handled by the onAuthStateChanged redirect,
    // but as a fallback or during the brief moment before redirect:
    return <SplashScreenDisplay />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/vibe.png" alt="vibe text logo" width={100} height={24} data-ai-hint="typography wordmark" priority />
          </Link>
          
          <div className="flex-1" /> {/* Spacer */}

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-9 w-9 border-2 border-primary/70 hover:border-primary transition-colors">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || 'User avatar'} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserCircle className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {currentUser.displayName || currentUser.email?.split('@')[0] || "User"}
                    </p>
                    {currentUser.email && (
                       <p className="text-xs leading-none text-muted-foreground">
                         {currentUser.email}
                       </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   {/* Placeholder for profile page */}
                  <Link href="#" className="flex items-center cursor-pointer">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                   {/* Placeholder for settings page */}
                  <Link href="#" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/dashboard" className="flex items-center">
              <Image src="/logo.png" alt="vibe app logo" width={48} height={48} data-ai-hint="abstract logo" priority />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 container max-w-screen-2xl py-6">
        {children}
      </main>
    </div>
  );
}
