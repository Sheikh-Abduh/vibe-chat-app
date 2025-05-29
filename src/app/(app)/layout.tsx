
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Settings, LayoutDashboard, Compass, MessageSquare, Search, Users, Edit3, Heart, Info, Gift, PersonStanding, Hash, Sparkles, BellDot, Activity } from 'lucide-react';
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

interface UserProfileDetails {
  displayName?: string;
  photoURL?: string;
  email?: string;
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
  communityJoinPreference?: 'yes' | 'no';
}

interface UserStoredDetails extends UserProfileDetails, Pick<UserAppSettings, 'communityJoinPreference'> {}


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userStoredDetails, setUserStoredDetails] = useState<UserStoredDetails | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let onboardingComplete = false;
        let fetchedProfileDetails: UserProfileDetails = {};
        let fetchedAppSettings: Partial<UserAppSettings> = {};

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          fetchedAppSettings = data.appSettings || {};
          fetchedProfileDetails = data.profileDetails || {};
          onboardingComplete = fetchedAppSettings.onboardingComplete === true;
        }
        
        setUserStoredDetails({
          displayName: user.displayName || fetchedProfileDetails.displayName || "",
          photoURL: user.photoURL || fetchedProfileDetails.photoURL || "",
          email: user.email || "",
          aboutMe: fetchedProfileDetails.aboutMe || "Tell us about yourself...",
          status: fetchedProfileDetails.status || "What's on your mind?",
          hobbies: fetchedProfileDetails.hobbies || "Not set",
          age: fetchedProfileDetails.age || "Not set",
          gender: fetchedProfileDetails.gender || "Not set",
          tags: fetchedProfileDetails.tags || "Not set",
          passion: fetchedProfileDetails.passion || "Not set",
          communityJoinPreference: fetchedAppSettings.communityJoinPreference || 'no',
        });

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
      setUserStoredDetails(null); 
      
      // Firestore settings are user-specific and don't need manual clearing here
      // as ThemeProvider will revert to defaults on user change.
      // However, if you had other non-user-specific localStorage settings, clear them here.
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); 
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: "Could not log you out. Please try again." });
      setIsCheckingAuth(false);
    }
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }
  
  const passionDisplay = userStoredDetails?.passion ? userStoredDetails.passion.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Not set";

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar side="left" collapsible="icon" className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarHeader className="flex justify-center items-center p-1">
           <Link href="/dashboard">
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
                  <AvatarImage src={userStoredDetails?.photoURL || undefined} alt={userStoredDetails?.displayName || currentUser.email || 'User avatar'} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserCircle className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <span className="hidden group-data-[state=expanded]:inline text-sm text-sidebar-foreground truncate">
                  {userStoredDetails?.displayName || currentUser.email?.split('@')[0] || "User"}
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
                     <AvatarImage src={userStoredDetails?.photoURL || undefined} alt={userStoredDetails?.displayName || 'User avatar'} />
                     <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                       {(userStoredDetails?.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   <div>
                      <p className="text-base font-semibold leading-none text-card-foreground">
                        {userStoredDetails?.displayName || currentUser.email?.split('@')[0] || "User"}
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
                {userStoredDetails?.aboutMe && (
                  <div className="flex items-start">
                    <Info className="mr-2.5 h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                        <span className="text-muted-foreground font-medium">About:</span>
                        <p className="italic text-card-foreground/90 leading-snug">{userStoredDetails.aboutMe !== "Tell us about yourself..." && userStoredDetails.aboutMe !== "" ? userStoredDetails.aboutMe : <span className="text-muted-foreground">Not set</span>}</p>
                    </div>
                  </div>
                )}
                 {userStoredDetails?.status && (
                  <div className="flex items-start">
                    <MessageSquare className="mr-2.5 h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div>
                        <span className="text-muted-foreground font-medium">Status:</span>
                        <p className="italic text-card-foreground/90 leading-snug">{userStoredDetails.status !== "What's on your mind?" && userStoredDetails.status !== "" ? userStoredDetails.status : <span className="text-muted-foreground">Not set</span>}</p>
                    </div>
                  </div>
                )}
                {userStoredDetails?.hobbies && userStoredDetails.hobbies !== "Not set" && userStoredDetails.hobbies !== "" && (
                  <div className="flex items-center">
                    <Sparkles className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Hobbies:</span> <span className="text-card-foreground/90">{userStoredDetails.hobbies}</span>
                  </div>
                )}
                {userStoredDetails?.age && userStoredDetails.age !== "Not set" && (
                  <div className="flex items-center">
                     <Gift className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Age:</span> <span className="text-card-foreground/90">{userStoredDetails.age}</span>
                  </div>
                )}
                 {userStoredDetails?.gender && userStoredDetails.gender !== "Not set" && (
                  <div className="flex items-center">
                     <PersonStanding className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Gender:</span> <span className="text-card-foreground/90">{userStoredDetails.gender}</span>
                  </div>
                )}
                {userStoredDetails?.tags && userStoredDetails.tags !== "Not set" && userStoredDetails.tags !== "" && (
                  <div className="flex items-center">
                     <Hash className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Tags:</span> <span className="text-card-foreground/90">{userStoredDetails.tags}</span>
                  </div>
                )}
                {userStoredDetails?.passion && userStoredDetails.passion !== "Not set" && (
                  <div className="flex items-center">
                    <Heart className="mr-2.5 h-4 w-4 text-accent shrink-0" />
                    <span className="text-muted-foreground font-medium mr-1.5">Passion:</span> <span className="text-card-foreground/90">{passionDisplay}</span>
                  </div>
                )}
              </div>

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
                  <Image src="/vibe.png" alt="vibe text logo" width={60} height={14} className="block sm:hidden" data-ai-hint="typography wordmark" priority />
                  <Image src="/vibe.png" alt="vibe text logo" width={80} height={19} className="hidden sm:block" data-ai-hint="typography wordmark" priority />
                </Link>
              </div>

              <div className="ml-auto flex items-center space-x-1 sm:space-x-2">
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
