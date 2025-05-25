
"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { LogOut, UserCircle, Settings, LayoutDashboard, Compass, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          setIsCheckingAuth(false); 
        } else {
          if (!pathname.startsWith('/onboarding')) {
            router.replace('/onboarding/avatar'); 
          } else {
            setIsCheckingAuth(false); 
          }
        }
      } else {
        router.replace('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
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

  if (!currentUser && !pathname.startsWith('/onboarding')) {
    return <SplashScreenDisplay />;
  }
  
  if (!currentUser && pathname.startsWith('/onboarding')) {
      return <>{children}</>; 
  }
  
  if (!currentUser) {
      return <SplashScreenDisplay />; 
  }


  return (
    <SidebarProvider defaultOpen={false}> {/* Sidebar collapsed by default */}
      <Sidebar side="left" collapsible="icon" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarHeader className="p-4 flex justify-center items-center">
           <Link href="/dashboard" className="block">
             <Image src="/logo.png" alt="vibe app logo" width={70} height={70} data-ai-hint="abstract logo" priority />
           </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard" isActive={pathname === '/dashboard'} tooltip="Dashboard">
                <LayoutDashboard />
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname === '/discover'} tooltip="Discover">
                <Compass />
                Discover
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname === '/messages'} tooltip="Messages">
                <MessageSquare />
                Messages
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname.startsWith('/profile')} tooltip="Profile">
                <UserCircle />
                Profile
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname.startsWith('/settings')} tooltip="Settings">
                <Settings />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-full rounded-md p-0 flex items-center justify-center group-data-[state=expanded]:justify-start group-data-[state=expanded]:px-2 group-data-[state=expanded]:gap-2">
                <Avatar className="h-9 w-9 avatar-pulse-neon">
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || 'User avatar'} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserCircle className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <span className="hidden group-data-[state=expanded]:inline text-sm text-sidebar-foreground truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || "User"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="mb-1 ml-1 min-w-[220px]" sideOffset={12}>
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
                <Link href="#" className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="#" className="flex items-center cursor-pointer text-muted-foreground hover:text-foreground">
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
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
          <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container relative flex h-16 max-w-screen-2xl items-center">
              <div className="flex items-center">
                 <SidebarTrigger className="mr-3 lg:hidden" /> 
              </div>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link href="/dashboard" className="flex items-center">
                  <Image src="/vibe.png" alt="vibe text logo" width={80} height={19} data-ai-hint="typography wordmark" priority />
                </Link>
              </div>

              <div className="ml-auto flex items-center space-x-4">
                {/* User avatar previously here, now moved to sidebar footer */}
                {/* Can add other header items here if needed, like a search bar or notifications */}
                 <Button variant="ghost" size="icon" className="rounded-full">
                    <Search className="h-5 w-5" />
                    <span className="sr-only">Search</span>
                  </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 container max-w-screen-2xl py-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
