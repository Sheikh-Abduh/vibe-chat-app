
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, type User, signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { getFunctions, httpsCallable } from "firebase/functions";


type DmPreference = "anyone" | "friends" | "none";
type ProfileVisibility = "public" | "friends" | "private";

interface UserAdvancedSettings {
  dmPreference?: DmPreference;
  profileVisibility?: ProfileVisibility;
}

export default function AdvancedSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isSavingDmPreference, setIsSavingDmPreference] = useState(false);
  const [isSavingProfileVisibility, setIsSavingProfileVisibility] = useState(false);

  const [dmPreference, setDmPreference] = useState<DmPreference>("anyone");
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("public");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const settings = userDocSnap.data().advancedSettings as UserAdvancedSettings | undefined;
          if (settings?.dmPreference) setDmPreference(settings.dmPreference);
          if (settings?.profileVisibility) setProfileVisibility(settings.profileVisibility);
        }
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const saveAdvancedSetting = async (key: keyof UserAdvancedSettings, value: string) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to save settings." });
      return;
    }
    
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let existingAdvancedSettings = {};
      if (userDocSnap.exists() && userDocSnap.data().advancedSettings) {
        existingAdvancedSettings = userDocSnap.data().advancedSettings;
      }
      const updatedSettings = {
        ...existingAdvancedSettings,
        [key]: value
      };
      await setDoc(userDocRef, {
        advancedSettings: updatedSettings
      }, { merge: true });
      
      // More descriptive success messages
      const settingNames = {
        dmPreference: 'Direct Message preference',
        profileVisibility: 'Profile visibility'
      };
      
      toast({ 
        title: "Setting Updated", 
        description: `${settingNames[key] || key} has been saved successfully.` 
      });
    } catch (error) {
      console.error("Error saving advanced setting:", error);
      toast({ 
        variant: "destructive", 
        title: "Save Failed", 
        description: "Could not save your preference. Please try again." 
      });
    }
  };


  const handleDmPreferenceChange = async (value: DmPreference) => {
    setDmPreference(value);
    setIsSavingDmPreference(true);
    await saveAdvancedSetting('dmPreference', value);
    setIsSavingDmPreference(false);
  };

  const handleProfileVisibilityChange = async (value: ProfileVisibility) => {
    setProfileVisibility(value);
    setIsSavingProfileVisibility(true);
    await saveAdvancedSetting('profileVisibility', value);
    setIsSavingProfileVisibility(false);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete your account." });
      return;
    }
    
    // Show password dialog for re-authentication
    setShowPasswordDialog(true);
  };

  const confirmDeleteAccount = async () => {
    if (!currentUser || !deletePassword.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your password to confirm." });
      return;
    }
    
    setIsDeleting(true);
    setShowPasswordDialog(false);
    
    try {
      // Re-authenticate user for security
      if (currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
        await reauthenticateWithCredential(currentUser, credential);
      } else {
        throw new Error("No email found for re-authentication");
      }
      
      // Try Cloud Function first, fallback to client-side deletion
      let deletionSuccessful = false;
      
      try {
        // Attempt Cloud Function deletion
        const functionsInstance = getFunctions();
        const deleteUserAccountFn = httpsCallable(functionsInstance, 'deleteUserAccount');
        await deleteUserAccountFn();
        deletionSuccessful = true;
        
        toast({
          title: "Account Deletion Successful",
          description: "Your account and associated data have been deleted via secure server process.",
          duration: 5000,
        });
      } catch (cloudFunctionError: any) {
        console.log("Cloud Function unavailable, attempting client-side deletion:", cloudFunctionError.message);
        
        // Check if this is a specific Cloud Function unavailability error
        const isCloudFunctionUnavailable = 
          cloudFunctionError.code === 'functions/not-found' ||
          cloudFunctionError.code === 'functions/unavailable' ||
          cloudFunctionError.code === 'functions/internal' ||
          cloudFunctionError.message?.includes('internal') ||
          cloudFunctionError.message?.includes('not found');
        
        if (isCloudFunctionUnavailable) {
          toast({
            title: "Using Alternative Deletion Method",
            description: "Cloud services unavailable. Using secure client-side deletion...",
            duration: 3000,
          });
        }
        
        // Fallback: Client-side deletion for free tier users
        try {
          toast({
            title: "Processing Account Deletion",
            description: "Deleting your account data...",
            duration: 2000,
          });
          
          // Delete user data from Firestore (client-side)
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            // Mark user document as deleted (soft delete approach)
            await setDoc(userDocRef, { 
              deleted: true, 
              deletedAt: new Date(),
              deletedBy: 'client-side-fallback'
            }, { merge: true });
            
            console.log("User document marked as deleted");
          }
          
          // Delete from Firebase Auth (this will also trigger cleanup)
          await currentUser.delete();
          deletionSuccessful = true;
          
          toast({
            title: "Account Deletion Successful",
            description: "Your account has been deleted. Some data cleanup may occur in the background.",
            duration: 5000,
          });
        } catch (clientError: any) {
          console.error("Client-side deletion also failed:", clientError);
          throw clientError; // Re-throw to be handled by outer catch
        }
      }
      
      if (deletionSuccessful) {
        // Sign out and redirect
        await signOut(auth);
        router.push('/login');
      }
      
    } catch (error: any) {
      console.error("Delete account error:", error);
      let errorMessage = "Could not delete your account. Please try again later.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Incorrect password. Please try again.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case 'auth/user-mismatch':
            errorMessage = "Authentication error. Please log out and log back in.";
            break;
          case 'functions/unauthenticated':
            errorMessage = "Authentication expired. Please log out and log back in.";
            break;
          case 'functions/not-found':
            errorMessage = "User account not found. It may have already been deleted.";
            break;
          case 'functions/permission-denied':
            errorMessage = "Insufficient permissions to delete account. Please contact support.";
            break;
          case 'functions/internal':
            errorMessage = "Server error occurred during account deletion. Using alternative deletion method...";
            break;
          case 'functions/unavailable':
            errorMessage = "Account deletion service is temporarily unavailable. Please try again later.";
            break;
          default:
            // Check for more detailed error information
            if (error.details) {
              errorMessage = error.details;
            } else if (error.message) {
              // Extract meaningful message from Firebase error
              if (error.message.includes('User not found')) {
                errorMessage = "User account not found. It may have already been deleted.";
              } else if (error.message.includes('permission')) {
                errorMessage = "Permission denied. Please contact support.";
              } else if (error.message.includes('network')) {
                errorMessage = "Network error. Please check your connection and try again.";
              } else {
                errorMessage = `Account deletion failed: ${error.message}`;
              }
            }
        }
      }
      
      toast({
        variant: "destructive",
        title: "Account Deletion Failed",
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
      setDeletePassword("");
    }
  };

  if (isCheckingAuth || !currentUser) {
    return <SplashScreenDisplay />;
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden p-6">
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
        <Card className="w-full bg-card border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-accent" /> Privacy Controls
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              Manage who can interact with you and see your profile. For detailed profile field visibility settings, visit your <span className="text-accent hover:underline cursor-pointer" onClick={() => router.push('/settings/profile')}>Profile Settings</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <Label className="text-base font-semibold text-foreground flex items-center mb-2">
                <MessageCircle className="mr-2 h-5 w-5 text-muted-foreground" /> Who can DM you?
                {isSavingDmPreference && <Loader2 className="ml-2 h-4 w-4 animate-spin text-accent" />}
              </Label>
              <RadioGroup 
                value={dmPreference} 
                onValueChange={(val) => handleDmPreferenceChange(val as DmPreference)} 
                className="space-y-1"
                disabled={isSavingDmPreference}
              >
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
                {isSavingProfileVisibility && <Loader2 className="ml-2 h-4 w-4 animate-spin text-accent" />}
              </Label>
              <RadioGroup 
                value={profileVisibility} 
                onValueChange={(val) => handleProfileVisibilityChange(val as ProfileVisibility)} 
                className="space-y-1"
                disabled={isSavingProfileVisibility}
              >
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
                    You will be asked to re-enter your password for security.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Continue to Password Verification
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* Password Confirmation Dialog */}
            <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Account Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Please enter your password to confirm account deletion. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="delete-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-2"
                    disabled={isDeleting}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    disabled={isDeleting}
                    onClick={() => {
                      setDeletePassword("");
                      setShowPasswordDialog(false);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteAccount}
                    disabled={isDeleting || !deletePassword.trim()}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isDeleting ? "Deleting..." : "Delete My Account"}
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

