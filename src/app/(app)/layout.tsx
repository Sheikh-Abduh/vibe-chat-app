
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
import { LogOut, UserCircle, Settings, LayoutDashboard, Compass, MessageSquare, Search, Users, Edit3, BookOpen, Tag, Sparkles, Heart } from 'lucide-react';
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

interface UserDetails {
  hobbies: string;
  age: string;
  tags: string;
  passion: string;
}

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
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

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
        // Fetch user details from localStorage
        const storedHobbies = localStorage.getItem(`userInterests_hobbies_${user.uid}`);
        const storedAge = localStorage.getItem(`userInterests_age_${user.uid}`);
        const storedTags = localStorage.getItem(`userInterests_tags_${user.uid}`);
        const storedPassionKey = localStorage.getItem(`userInterests_passion_${user.uid}`);
        
        const passionDisplay = storedPassionKey ? storedPassionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Not set";

        setUserDetails({
          hobbies: storedHobbies || "Not set",
          age: storedAge || "Not set",
          tags: storedTags || "Not set",
          passion: passionDisplay,
        });

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
      setUserDetails(null); 
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
    <SidebarProvider defaultOpen={false}> 
      <Sidebar side="left" collapsible="icon" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarHeader className="flex justify-center items-center"> 
           <Link href="/dashboard" className="block">
             <Image src="/logo.png" alt="vibe app logo" width={48} height={48} data-ai-hint="abstract logo" priority />
           </Link>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-6 pb-2"> 
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
              <SidebarMenuButton href="#" isActive={pathname === '/communities'} tooltip="Communities">
                <Users />
                Communities
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="#" isActive={pathname === '/messages'} tooltip="Messages">
                <MessageSquare />
                Messages
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
              <Button 
                variant="ghost" 
                className="relative h-12 w-full rounded-md p-0 flex items-center justify-center 
                           hover:bg-transparent focus:bg-transparent 
                           group-data-[state=expanded]:justify-start group-data-[state=expanded]:px-2 group-data-[state=expanded]:gap-2
                           focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
              >
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
            <DropdownMenuContent 
              side="right" 
              align="start" 
              className="mb-1 ml-1 min-w-[280px] bg-card border-border shadow-xl rounded-lg p-4" 
              sideOffset={12}
            >
              <DropdownMenuLabel className="font-normal p-0 mb-3">
                <div className="flex items-center space-x-3">
                   <Avatar className="h-12 w-12">
                     <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User avatar'} />
                     <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                       {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                      <p className="text-base font-semibold leading-none text-card-foreground">
                        {currentUser.displayName || currentUser.email?.split('@')[0] || "User"}
                      </p>
                      {currentUser.email && (
                         <p className="text-xs leading-none text-muted-foreground mt-1">
                           {currentUser.email}
                         </p>
                      )}
                   </div>
                </div>
              </DropdownMenuLabel>
              
              <div className="space-y-2 text-sm text-card-foreground mb-3">
                {userDetails?.hobbies && userDetails.hobbies !== "Not set" && (
                  <div className="flex items-center">
                    <Sparkles className="mr-2 h-4 w-4 text-accent" />
                    <span className="text-muted-foreground mr-1">Hobbies:</span> {userDetails.hobbies}
                  </div>
                )}
                {userDetails?.age && userDetails.age !== "Not set" && (
                  <div className="flex items-center">
                     <UserCircle className="mr-2 h-4 w-4 text-accent" />
                    <span className="text-muted-foreground mr-1">Age:</span> {userDetails.age}
                  </div>
                )}
                {userDetails?.tags && userDetails.tags !== "Not set" && (
                  <div className="flex items-center">
                     <Tag className="mr-2 h-4 w-4 text-accent" />
                    <span className="text-muted-foreground mr-1">Tags:</span> {userDetails.tags}
                  </div>
                )}
                {userDetails?.passion && userDetails.passion !== "Not set" && (
                  <div className="flex items-center">
                    <Heart className="mr-2 h-4 w-4 text-accent" />
                    <span className="text-muted-foreground mr-1">Passion:</span> {userDetails.passion}
                  </div>
                )}
                 <div className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4 text-accent" />
                    <span className="text-muted-foreground mr-1">About:</span> <span className="italic text-muted-foreground">Tell us about yourself...</span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4 text-accent" />
                     <span className="text-muted-foreground mr-1">Status:</span> <span className="italic text-muted-foreground">What's on your mind?</span>
                  </div>
              </div>

              <DropdownMenuSeparator className="bg-border/50 my-2" />
              <DropdownMenuItem asChild>
                <Link href="#" className="flex items-center cursor-pointer text-accent hover:text-accent/80 focus:bg-accent/10">
                  <Edit3 className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive mt-1">
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
            <div className="container relative flex h-12 max-w-screen-2xl items-center"> 
              <div className="flex items-center">
                 <SidebarTrigger className="mr-3 lg:hidden" /> 
              </div>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link href="/dashboard" className="flex items-center">
                  <Image src="/vibe.png" alt="vibe text logo" width={80} height={19} data-ai-hint="typography wordmark" priority />
                </Link>
              </div>

              <div className="ml-auto flex items-center space-x-4">
                 {/* Search icon removed from here */}
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
