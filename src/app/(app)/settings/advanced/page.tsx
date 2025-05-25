
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Cog, Download, Eye, MessageCircle, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { getFunctions, httpsCallable } from "firebase/functions";


type DmPreference = "anyone" | "friends" | "none";
type ProfileVisibility = "public" | "friends" | "private";

export default function AdvancedSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [dmPreference, setDmPreference] = useState<DmPreference>("anyone");
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("public");

  const getStorageKey = useCallback((suffix: string) => {
    if (!currentUser) return null;
    return `advanced_${suffix}_${currentUser.uid}`;
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        
        const savedDmPrefKey = getStorageKey('dm_preference');
        if (savedDmPrefKey) {
          const savedDmPref = localStorage.getItem(savedDmPrefKey) as DmPreference | null;
          if (savedDmPref) setDmPreference(savedDmPref);
        }
        
        const savedProfileVisKey = getStorageKey('profile_visibility');
        if (savedProfileVisKey) {
          const savedProfileVis = localStorage.getItem(savedProfileVisKey) as ProfileVisibility | null;
          if (savedProfileVis) setProfileVisibility(savedProfileVis);
        }

        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, getStorageKey]);

  const handleDmPreferenceChange = (value: DmPreference) => {
    setDmPreference(value);
    const key = getStorageKey('dm_preference');
    if (key) {
      localStorage.setItem(key, value);
      toast({ title: "DM Preference Updated", description: `DM settings changed to: ${value.charAt(0).toUpperCase() + value.slice(1)}` });
    }
  };

  const handleProfileVisibilityChange = (value: ProfileVisibility) => {
    setProfileVisibility(value);
    const key = getStorageKey('profile_visibility');
    if (key) {
      localStorage.setItem(key, value);
      toast({ title: "Profile Visibility Updated", description: `Profile visibility set to: ${value.charAt(0).toUpperCase() + value.slice(1)}` });
    }
  };

  const handleExportData = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to export data." });
      return;
    }
    setIsExporting(true);
    toast({ title: "Data Export Initiated", description: "We're preparing your data. This may take a moment..." });

    try {
      // Gather client-side data
      const clientSideData: Record<string, string | null> = {};
      const keysToExportFromLocalStorage = [
        `userProfile_aboutMe_${currentUser.uid}`,
        `userProfile_status_${currentUser.uid}`,
        `userInterests_hobbies_${currentUser.uid}`,
        `userInterests_age_${currentUser.uid}`,
        `userInterests_gender_${currentUser.uid}`,
        `userInterests_tags_${currentUser.uid}`,
        `userInterests_passion_${currentUser.uid}`,
        `theme_mode_${currentUser.uid}`,
        `theme_accent_primary_${currentUser.uid}`,
        `theme_accent_primary_fg_${currentUser.uid}`,
        `theme_accent_secondary_${currentUser.uid}`,
        `theme_accent_secondary_fg_${currentUser.uid}`,
        `ui_scale_${currentUser.uid}`,
        `advanced_dm_preference_${currentUser.uid}`,
        `advanced_profile_visibility_${currentUser.uid}`,
        `notifications_messages_enabled_${currentUser.uid}`,
        `notifications_friendRequests_enabled_${currentUser.uid}`,
        `notifications_messageRequests_enabled_${currentUser.uid}`,
        `notifications_communityInvites_enabled_${currentUser.uid}`,
        `notifications_delivery_email_enabled_${currentUser.uid}`,
        `notifications_delivery_push_enabled_${currentUser.uid}`,
        `notifications_delivery_inApp_enabled_${currentUser.uid}`,
        `notifications_delivery_notificationCentre_enabled_${currentUser.uid}`,
        `community_join_preference_${currentUser.uid}`,
      ];

      keysToExportFromLocalStorage.forEach(key => {
        clientSideData[key.replace(`_${currentUser.uid}`, '')] = localStorage.getItem(key);
      });
      
      // Add other potentially useful data if needed
      clientSideData.displayName = currentUser.displayName;
      clientSideData.email = currentUser.email;
      clientSideData.photoURL = currentUser.photoURL;


      const functionsInstance = getFunctions();
      const exportUserDataFn = httpsCallable(functionsInstance, 'exportUserData');
      
      const result = await exportUserDataFn({ clientSideData });
      const { dataString, error } = result.data as { dataString?: string; error?: string };

      if (error) {
        throw new Error(error || "Unknown error from export function.");
      }

      if (dataString) {
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `vibe_export_${currentUser.uid}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        toast({ title: "Data Export Successful!", description: "Your data has been downloaded." });
      } else {
        throw new Error("No data string received from export function.");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "Could not export your data. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Actual deletion would involve re-authentication and backend calls
    // For now, simulate the process
    if (!currentUser) return;
    
    setIsDeleting(true); // Disable button in dialog

    // Simulate backend call and re-auth
    // In a real app:
    // 1. Prompt for password / re-authenticate
    // 2. Call a Cloud Function to delete all user data from Firestore, Storage, etc.
    // 3. Call Firebase Auth user.delete()
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Simulate sign out after "deletion"
      await signOut(auth);
      toast({
        variant: "destructive",
        title: "Account Deletion Process Initiated (Simulated)",
        description: "You have been signed out.",
      });
      // Clear any sensitive local storage data
      // Object.keys(localStorage).forEach(key => {
      //   if (key.includes(currentUser.uid)) {
      //     localStorage.removeItem(key);
      //   }
      // });
      router.push('/login'); // Redirect to login
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not complete simulated deletion. " + error.message });
      setIsDeleting(false);
    }
    // setIsDeleting(false) might not be reached if navigation happens first.
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="px-4 pb-8">
      <div className="flex items-center my-6">
        <Button variant="ghost" size="icon" className="mr-2 hover:bg-accent/10" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-5 w-5 text-accent" />
        </Button>
        <Cog className="mr-3 h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
          Advanced Settings
        </h1>
      </div>

      <div className="space-y-8">
        {/* Privacy Controls Card */}
        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-accent" /> Privacy Controls
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Manage who can interact with you and see your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <Label className="text-base font-semibold text-foreground flex items-center mb-2">
                <MessageCircle className="mr-2 h-5 w-5 text-muted-foreground" /> Who can DM you?
              </Label>
              <RadioGroup value={dmPreference} onValueChange={(val) => handleDmPreferenceChange(val as DmPreference)} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anyone" id="dm-anyone" />
                  <Label htmlFor="dm-anyone" className="font-normal text-foreground cursor-pointer">Anyone</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friends" id="dm-friends" />
                  <Label htmlFor="dm-friends" className="font-normal text-foreground cursor-pointer">Friends Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="dm-none" />
                  <Label htmlFor="dm-none" className="font-normal text-foreground cursor-pointer">No One</Label>
                </div>
              </RadioGroup>
            </div>
            <Separator className="bg-border/50" />
            <div>
              <Label className="text-base font-semibold text-foreground flex items-center mb-2">
                <Eye className="mr-2 h-5 w-5 text-muted-foreground" /> Who can see your profile?
              </Label>
              <RadioGroup value={profileVisibility} onValueChange={(val) => handleProfileVisibilityChange(val as ProfileVisibility)} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="profile-public" />
                  <Label htmlFor="profile-public" className="font-normal text-foreground cursor-pointer">Public</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="friends" id="profile-friends" />
                  <Label htmlFor="profile-friends" className="font-normal text-foreground cursor-pointer">Friends Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="profile-private" />
                  <Label htmlFor="profile-private" className="font-normal text-foreground cursor-pointer">Only Me (Private)</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <Download className="mr-2 h-6 w-6 text-accent" /> Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              variant="outline" 
              onClick={handleExportData} 
              disabled={isExporting}
              className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? "Processing..." : "Export My Data"}
            </Button>
            <CardDescription className="text-xs text-muted-foreground mt-2">
              Download a copy of your account data. This includes data stored in Firestore (simulated) and preferences from local storage.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Account Actions Card */}
        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-destructive flex items-center">
              <Trash2 className="mr-2 h-6 w-6 text-destructive" /> Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers. (Simulated: This will sign you out.)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount} 
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isDeleting ? "Deleting..." : "Yes, delete account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <CardDescription className="text-xs text-muted-foreground mt-2">
              Permanently delete your account and all associated data (simulated: signs out).
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

      