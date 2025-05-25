
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
import { LogOut, UserCircle, Settings, LayoutDashboard, Compass, MessageSquare, Search, Users, Edit3, BookOpen, Tag, Sparkles, Heart, Info } from 'lucide-react';
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
} from '@/components/ui/sidebar';

interface UserStoredDetails {
  hobbies: string;
  age: string;
  tags: string;
  passion: string;
  aboutMe: string;
  status: string;
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
  const [userDetails, setUserDetails] = useState<UserStoredDetails | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          setIsCheckingAuth(false); 
        } else {
          // This check handles cases where user might be on an app page but hasn't onboarded
          // or tries to access onboarding pages after completion
          if (pathname.startsWith('/onboarding')) {
             setIsCheckingAuth(false); // Allow access to onboarding pages if not complete
          } else {
            router.replace('/onboarding/avatar'); 
          }
        }
        // Fetch user details from localStorage for the avatar card
        const storedHobbies = localStorage.getItem(`userInterests_hobbies_${user.uid}`);
        const storedAge = localStorage.getItem(`userInterests_age_${user.uid}`);
        const storedTags = localStorage.getItem(`userInterests_tags_${user.uid}`);
        const storedPassionKey = localStorage.getItem(`userInterests_passion_${user.uid}`);
        const storedAboutMe = localStorage.getItem(`userProfile_aboutMe_${user.uid}`);
        const storedStatus = localStorage.getItem(`userProfile_status_${user.uid}`);
        
        const passionDisplay = storedPassionKey ? storedPassionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Not set";

        setUserDetails({
          hobbies: storedHobbies || "Not set",
          age: storedAge || "Not set",
          tags: storedTags || "Not set",
          passion: passionDisplay,
          aboutMe: storedAboutMe || "Tell us about yourself...",
          status: storedStatus || "What's on your mind?",
        });

      } else {
        router.replace('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router, pathname]); // Added pathname to dependencies to re-evaluate if user is on onboarding

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
     // If somehow not checking auth, no user, and not on onboarding -> splash (then login)
    return <SplashScreenDisplay />;
  }
  
  // If user is not authenticated but trying to access onboarding pages, allow children to render (onboarding pages handle their own auth checks)
  if (!currentUser && pathname.startsWith('/onboarding')) {
      return <>{children}</>; 
  }
  
  // Final fallback if no user after checks (e.g. if onboarding check fails to redirect to /login)
  if (!currentUser) {
      return <SplashScreenDisplay />; 
  }


  return (
    <SidebarProvider defaultOpen={false}> 
      <Sidebar side="left" collapsible="icon" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarHeader className="flex justify-center items-center p-1"> 
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
              <SidebarMenuButton href="/settings" isActive={pathname.startsWith('/settings')} tooltip="Settings">
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
              className="mb-1 ml-1 min-w-[300px] bg-card border-border shadow-xl rounded-lg p-4" 
              sideOffset={12}
            >
              <DropdownMenuLabel className="font-normal p-0 mb-4">
                <div className="flex items-center space-x-3">
                   <Avatar className="h-14 w-14">
                     <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User avatar'} />
                     <AvatarFallback className="bg-muted text-muted-foreground text-xl">
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
              
              <div className="space-y-2.5 text-sm text-card-foreground mb-4 text-left">
                {userDetails?.aboutMe && (
                  <div className="flex items-start">
                    <Info className="mr-2.5 h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                        <span className="text-muted-foreground font-medium">About:</span>
                        <p className="italic text-card-foreground/90 leading-snug">{userDetails.aboutMe !== "Tell us about yourself..." ? userDetails.aboutMe : <span className="text-muted-foreground">{userDetails.aboutMe}</span>}</p>
                    </div>
                  </div>
                )}
                 {userDetails?.status && (
                  <div className="flex items-start">
                    <MessageSquare className="mr-2.5 h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                        <span className="text-muted-foreground font-medium">Status:</span>
                        <p className="italic text-card-foreground/90 leading-snug">{userDetails.status !== "What's on your mind?" ? userDetails.status : <span className="text-muted-foreground">{userDetails.status}</span>}</p>
                    </div>
                  </div>
                )}
                {userDetails?.hobbies && userDetails.hobbies !== "Not set" && (
                  <div className="flex items-center">
                    <Sparkles className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Hobbies:</span> <span className="text-card-foreground/90">{userDetails.hobbies}</span>
                  </div>
                )}
                {userDetails?.age && userDetails.age !== "Not set" && (
                  <div className="flex items-center">
                     <Gift className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Age:</span> <span className="text-card-foreground/90">{userDetails.age}</span>
                  </div>
                )}
                {userDetails?.tags && userDetails.tags !== "Not set" && (
                  <div className="flex items-center">
                     <Tag className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Tags:</span> <span className="text-card-foreground/90">{userDetails.tags}</span>
                  </div>
                )}
                {userDetails?.passion && userDetails.passion !== "Not set" && (
                  <div className="flex items-center">
                    <Heart className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Passion:</span> <span className="text-card-foreground/90">{userDetails.passion}</span>
                  </div>
                )}
              </div>

              <DropdownMenuSeparator className="bg-border/50 my-2" />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center cursor-pointer text-accent hover:text-accent/80 focus:bg-accent/10 focus:text-accent text-sm py-2">
                  <Edit3 className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive mt-1 text-sm py-2">
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
              {/* SidebarTrigger removed from here as per user request; mobile access might be an issue */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link href="/dashboard" className="flex items-center">
                  <Image src="/vibe.png" alt="vibe text logo" width={80} height={19} data-ai-hint="typography wordmark" priority />
                </Link>
              </div>

              <div className="ml-auto flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground">
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
