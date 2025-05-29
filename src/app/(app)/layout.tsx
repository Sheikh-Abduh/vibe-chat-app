
"use client";

import React, { useEffect, useState, Suspense } from 'react'; 
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Firestore imports
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
import { LogOut, UserCircle, Settings, LayoutDashboard, Compass, MessageSquare, Search, Users, Edit3, Heart, Info, Gift, PersonStanding, Hash, Sparkles, BellDot } from 'lucide-react';
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
  hobbies?: string;
  age?: string;
  gender?: string;
  tags?: string;
  passion?: string;
  aboutMe?: string;
  status?: string;
}

interface UserAppSettings {
  onboardingComplete?: boolean;
  themeMode?: 'light' | 'dark';
  themePrimaryAccent?: string;
  themePrimaryAccentFg?: string;
  themeSecondaryAccent?: string;
  themeSecondaryAccentFg?: string;
  uiScale?: 'compact' | 'default' | 'comfortable';
  // Add other app settings as needed
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userDetails, setUserDetails] = useState<UserStoredDetails | null>(null);
  const [userAppSettings, setUserAppSettings] = useState<UserAppSettings | null>(null);
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Fetch settings from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let onboardingComplete = false;
        let fetchedAppSettings: UserAppSettings = {};
        let fetchedUserDetails: UserStoredDetails = {};

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          onboardingComplete = data.appSettings?.onboardingComplete === true;
          fetchedAppSettings = data.appSettings || {};
          fetchedUserDetails = data.profileDetails || {};
        }
        
        setUserAppSettings(fetchedAppSettings);
        setUserDetails(fetchedUserDetails);

        if (onboardingComplete) {
          setIsCheckingAuth(false);
        } else {
          if (pathname.startsWith('/onboarding')) {
             setIsCheckingAuth(false);
          } else {
            router.replace('/onboarding/avatar');
          }
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, pathname]); 

  const handleLogout = async () => {
    setIsCheckingAuth(true); 
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserDetails(null);
      setUserAppSettings(null); // Clear app settings on logout
      // Note: We don't clear localStorage here anymore, as settings are in Firestore.
      // If there were any purely local, non-synced localStorage items, clear them.
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
      setIsCheckingAuth(false); 
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

  const passionDisplay = userDetails?.passion ? userDetails.passion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Not set";

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
              <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/discover'} tooltip="Discover">
                <Link href="/discover">
                  <Compass />
                  Discover
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/communities'} tooltip="Communities">
                <Link href="/communities">
                  <Users />
                  Communities
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/messages')} tooltip="Messages">
                <Link href="/messages">
                  <MessageSquare />
                  Messages
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith('/activity')} tooltip="Activity">
                  <Link href="/activity">
                    <BellDot /> 
                    Activity
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/settings')} tooltip="Settings">
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-12 w-full rounded-md p-0 flex items-center justify-center hover:bg-transparent focus:bg-transparent group-data-[state=expanded]:justify-start group-data-[state=expanded]:px-2 group-data-[state=expanded]:gap-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
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
                 {userDetails?.gender && userDetails.gender !== "Not set" && (
                  <div className="flex items-center">
                     <PersonStanding className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Gender:</span> <span className="text-card-foreground/90">{userDetails.gender}</span>
                  </div>
                )}
                {userDetails?.tags && userDetails.tags !== "Not set" && (
                  <div className="flex items-center">
                     <Hash className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Tags:</span> <span className="text-card-foreground/90">{userDetails.tags}</span>
                  </div>
                )}
                {userDetails?.passion && userDetails.passion !== "Not set" && (
                  <div className="flex items-center">
                    <Heart className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Passion:</span> <span className="text-card-foreground/90">{passionDisplay}</span>
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
        <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
          <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 h-12">
            <div className="relative flex h-full items-center px-4">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Link href="/dashboard" className="flex items-center">
                  <Image src="/vibe.png" alt="vibe text logo" width={80} height={19} data-ai-hint="typography wordmark" priority />
                </Link>
              </div>

              <div className="ml-auto flex items-center space-x-2">
                 <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground relative" asChild>
                    <Link href="/activity">
                        <BellDot className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground p-1.5">3</span> 
                        <span className="sr-only">Activity Feed</span>
                    </Link>
                </Button>
                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground" onClick={() => toast({title: "Coming Soon!", description: "Global search will be implemented."})}>
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={<SplashScreenDisplay />}>
              {children}
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutContent>{children}</AppLayoutContent>;
}
