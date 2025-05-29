
"use client";

import { useState, type ChangeEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UploadCloud, UserCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { updateProfile, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app'; 

export default function AvatarUploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().appSettings?.onboardingComplete === true) {
          router.replace('/dashboard');
        } else {
          setIsCheckingAuth(false);
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please select an image smaller than 2MB.',
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select a JPG, PNG, WEBP, or GIF image.',
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadButtonClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleNext = async () => {
    let userForOperation = auth.currentUser;
    if (!userForOperation) {
        await auth.currentUser?.reload(); 
        userForOperation = auth.currentUser;
    }
    
    if (!userForOperation) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You are not logged in. Please log in again.',
      });
      router.push('/login');
      return;
    }

    if (!avatarFile) {
      toast({
        title: 'Skipping Avatar',
        description: 'Proceeding to the next step. You can set an avatar later.',
      });
      router.push('/onboarding/interests');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', avatarFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY); 

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Cloudinary upload failed.');
      }

      const data = await response.json();
      const newAvatarUrlFromCloudinary = data.secure_url;

      if (newAvatarUrlFromCloudinary) {
        let userForProfileUpdate = auth.currentUser; 
         if (!userForProfileUpdate) {
            await auth.currentUser?.reload();
            userForProfileUpdate = auth.currentUser;
        }

        if (userForProfileUpdate) {
          await updateProfile(userForProfileUpdate, { photoURL: newAvatarUrlFromCloudinary });
           // Also save to Firestore user document
          const userDocRef = doc(db, "users", userForProfileUpdate.uid);
          await setDoc(userDocRef, { profileDetails: { photoURL: newAvatarUrlFromCloudinary } }, { merge: true });

          toast({
            title: 'Avatar Uploaded!',
            description: 'Your profile picture has been updated.',
          });
          router.push('/onboarding/interests');
        } else {
           toast({ variant: 'destructive', title: 'Error updating profile', description: 'User session lost. Please try again.' });
        }
      } else {
        throw new Error('Cloudinary did not return a URL.');
      }
    } catch (error: any) {
      console.error("Error during Cloudinary upload or profile update:", error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload avatar or update profile.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = async () => {
    if (isUploading) return;
     let userForOperation = auth.currentUser;
    if (!userForOperation) {
       await auth.currentUser?.reload();
       userForOperation = auth.currentUser;
    }
    if (!userForOperation) {
       toast({ variant: 'destructive', title: 'Authentication Error', description: 'Please log in again.' });
       router.push('/login');
       return;
    }
    toast({
      title: 'Skipping Avatar',
      description: 'You can set an avatar from your profile later.',
    });
    router.push('/onboarding/interests');
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }
  
  if (!currentUser) {
    return <SplashScreenDisplay />; 
  }

  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="flex flex-col w-full max-w-lg max-h-[90vh] bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4 shrink-0">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Set Your vibe
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Upload a profile picture to personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto flex flex-col items-center space-y-6 px-6 pt-2">
          <Avatar
            className={`h-36 w-36 border-4 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.5),_0_0_5px_hsl(var(--accent)/0.3)] ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} transition-opacity`}
            onClick={handleUploadButtonClick}
            role="button"
            tabIndex={isUploading ? -1 : 0}
            onKeyDown={(e) => !isUploading && (e.key === 'Enter' || e.key === ' ') && handleUploadButtonClick()}
            aria-label="Upload profile picture"
            aria-disabled={isUploading}
          >
            <AvatarImage src={avatarPreview || currentUser.photoURL || undefined} alt="User Avatar Preview" className="object-cover"/>
            <AvatarFallback className="bg-muted hover:bg-muted/80">
              <UserCircle className="h-24 w-24 text-muted-foreground/70" />
            </AvatarFallback>
          </Avatar>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-hidden="true"
            disabled={isUploading}
          />
          <Button
            variant="outline"
            onClick={handleUploadButtonClick}
            disabled={isUploading}
            className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent
                       shadow-[0_0_8px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_12px_hsl(var(--accent)/0.6)]
                       focus:shadow-[0_0_12px_hsl(var(--accent)/0.6)]
                       transition-all duration-300 ease-in-out"
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-5 w-5" />
            )}
            {isUploading ? 'Processing...' : (avatarFile ? 'Change Picture' : 'Choose a Picture')}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-4 shrink-0">
          <Button
            onClick={handleNext}
            disabled={isUploading || !currentUser}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isUploading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isUploading ? 'Processing...' : (avatarFile ? 'Save & Continue' : 'Next')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isUploading || !currentUser}
            className="w-full text-muted-foreground hover:text-accent/80"
          >
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
