
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
import { ArrowLeft, Cog, Eye, MessageCircle, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
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

  const handleDeleteAccount = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete your account." });
      return;
    }

    setIsDeleting(true);

    // CRITICAL FOR PRODUCTION: Implement re-authentication here before calling the delete function.
    // Example: Prompt user for password, then:
    // import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
    // const credential = EmailAuthProvider.credential(currentUser.email, enteredPassword);
    // await reauthenticateWithCredential(currentUser, credential);
    // If successful, then proceed with the Cloud Function call.

    try {
      const functionsInstance = getFunctions();
      const deleteUserAccountFn = httpsCallable(functionsInstance, 'deleteUserAccount');

      // The Cloud Function should use context.auth.uid for security,
      // but passing uid can be useful for logging or specific scenarios if needed.
      await deleteUserAccountFn(); // No need to pass UID if function uses context.auth.uid

      toast({
        title: "Account Deletion Successful",
        description: "Your account and associated data have been deleted. You will be logged out.",
        duration: 5000,
      });

      await signOut(auth); // Sign out the user from the client

      // Clear any local storage associated with the user
      Object.keys(localStorage).forEach(key => {
        if (currentUser && key.includes(currentUser.uid)) { // Added null check for currentUser
          localStorage.removeItem(key);
        }
      });

      router.push('/login'); // Redirect to login page
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        variant: "destructive",
        title: "Account Deletion Failed",
        description: error.message || "Could not delete your account. Please try again later.",
      });
      setIsDeleting(false);
    }
    // No need to set isDeleting to false if successful, as user is navigated away.
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="p-6 h-full overflow-y-auto"> {/* Added p-6, h-full and overflow-y-auto */}
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
                    This action cannot be undone. This will permanently delete your account and associated data.
                    For security, you might be asked to re-enter your password.
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
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    