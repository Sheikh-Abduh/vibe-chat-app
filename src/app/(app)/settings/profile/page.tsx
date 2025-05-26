
"use client";

import { useState, useEffect, type ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Edit3, Sparkles, Gift, Hash, Heart, MessageSquare, Info, Loader2, PersonStanding, UploadCloud } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User, updateProfile } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';

// Cloudinary configuration (API Key is safe for client-side with unsigned uploads)
const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';

// Reusing from onboarding/interests page
const ageRanges = [
  "Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+",
];
const genderOptions = [
  "Male", "Female", "Non-binary", "Prefer not to say", "Other",
];
const passionOptions = [
  { value: "art_design", label: "Art & Design" },
  { value: "movies_tv", label: "Movies & TV" },
  { value: "music", label: "Music" },
  { value: "reading", label: "Reading" },
  { value: "technology", label: "Technology" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const profileSchema = z.object({
  displayName: z.string().min(3, { message: "Username must be at least 3 characters." }).optional(),
  aboutMe: z.string().optional().describe("A short bio about yourself"),
  status: z.string().optional().describe("Your current status or mood"),
  hobbies: z.string().optional().describe("Comma-separated list of hobbies"),
  age: z.string().optional(),
  gender: z.string().optional(),
  tags: z.string().optional().describe("Comma-separated list of tags"),
  passion: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      aboutMe: "",
      status: "",
      hobbies: "",
      age: "",
      gender: "",
      tags: "",
      passion: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Load existing data
        form.reset({
          displayName: user.displayName || "",
          aboutMe: localStorage.getItem(`userProfile_aboutMe_${user.uid}`) || "",
          status: localStorage.getItem(`userProfile_status_${user.uid}`) || "",
          hobbies: localStorage.getItem(`userInterests_hobbies_${user.uid}`) || "",
          age: localStorage.getItem(`userInterests_age_${user.uid}`) || "",
          gender: localStorage.getItem(`userInterests_gender_${user.uid}`) || "",
          tags: localStorage.getItem(`userInterests_tags_${user.uid}`) || "",
          passion: localStorage.getItem(`userInterests_passion_${user.uid}`) || "",
        });
        setAvatarPreview(user.photoURL);
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, form]);

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'Image Too Large', description: 'Please select an image smaller than 2MB.' });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select a JPG, PNG, WEBP, or GIF image.' });
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

  const handleUploadAvatarButtonClick = () => {
    if (isUploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    let profileUpdated = false;

    // 1. Update Display Name (Username)
    if (data.displayName && data.displayName !== currentUser.displayName) {
      try {
        await updateProfile(currentUser, { displayName: data.displayName });
        toast({ title: "Username Updated!", description: "Your display name has been changed." });
        profileUpdated = true;
      } catch (error: any) {
        console.error("Error updating display name:", error);
        toast({ variant: "destructive", title: "Username Update Failed", description: error.message || "Could not update your display name." });
      }
    }

    // 2. Update Avatar
    if (avatarFile) {
      setIsUploadingAvatar(true);
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
        const cloudinaryData = await response.json();
        const newAvatarUrlFromCloudinary = cloudinaryData.secure_url;

        if (newAvatarUrlFromCloudinary) {
          await updateProfile(currentUser, { photoURL: newAvatarUrlFromCloudinary });
          toast({ title: "Avatar Updated!", description: "Your profile picture has been changed." });
          profileUpdated = true;
        } else {
          throw new Error('Cloudinary did not return a URL.');
        }
      } catch (error: any) {
        console.error("Error uploading/updating avatar:", error);
        toast({ variant: "destructive", title: "Avatar Update Failed", description: error.message || "Could not update your avatar." });
      } finally {
        setIsUploadingAvatar(false);
      }
    }

    // 3. Save other details to localStorage
    localStorage.setItem(`userProfile_aboutMe_${currentUser.uid}`, data.aboutMe || "");
    localStorage.setItem(`userProfile_status_${currentUser.uid}`, data.status || "");
    localStorage.setItem(`userInterests_hobbies_${currentUser.uid}`, data.hobbies || "");
    localStorage.setItem(`userInterests_age_${currentUser.uid}`, data.age || "");
    localStorage.setItem(`userInterests_gender_${currentUser.uid}`, data.gender || "");
    localStorage.setItem(`userInterests_tags_${currentUser.uid}`, data.tags || "");
    localStorage.setItem(`userInterests_passion_${currentUser.uid}`, data.passion || "");
    
    // Check if localStorage data actually changed to set profileUpdated flag
    // This is a simplified check; for robust checking, compare with initial loaded values.
    if (form.formState.isDirty) { // isDirty is true if any form field changed from its initial loaded value
        profileUpdated = true;
    }
    
    if (profileUpdated) {
        toast({
          title: "Profile Updated!",
          description: "Your changes have been saved successfully.",
        });
    } else if (!avatarFile && (!data.displayName || data.displayName === currentUser.displayName)) {
        toast({
            title: "No Changes Detected",
            description: "Your profile details are already up-to-date.",
        });
    }
    
    setIsSubmitting(false);
    // Refresh form with potentially new currentUser.displayName and photoURL from Firebase
    // A full page refresh might be needed in some cases for AppLayout to pick up changes immediately without more complex global state.
    // For a smoother UX, consider a global user state that components can subscribe to.
    // For now, re-fetching from auth to update the form for next edit.
    if (auth.currentUser) {
      form.reset({
        ...data, // keep current form text data
        displayName: auth.currentUser.displayName || "",
      });
      setAvatarPreview(auth.currentUser.photoURL); // update avatar preview
    }
  };
  
  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser) {
   return <SplashScreenDisplay />; // Should be caught by useEffect redirect, but as a fallback
 }

  return (
    <div className="space-y-8 px-4 pb-8">
        <div className="flex items-center mb-6">
          <Edit3 className="mr-3 h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
            Edit Your Profile
          </h1>
        </div>
      <Card className="w-full bg-card border-border/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground flex items-center">
            <UserCircle className="mr-2 h-7 w-7 text-accent" />
            Your Details
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Update your profile information, username, and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Avatar Section */}
              <FormItem>
                <FormLabel className="text-muted-foreground flex items-center text-base">
                  <UserCircle className="mr-2 h-5 w-5 text-accent" /> Profile Picture
                </FormLabel>
                <div className="flex items-center gap-4 mt-2">
                  <Avatar
                    className={`h-24 w-24 border-2 border-primary shadow-md ${isUploadingAvatar ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} transition-opacity`}
                    onClick={handleUploadAvatarButtonClick}
                  >
                    <AvatarImage src={avatarPreview || undefined} alt="User Avatar Preview" className="object-cover"/>
                    <AvatarFallback className="bg-muted hover:bg-muted/80">
                      <UserCircle className="h-16 w-16 text-muted-foreground/70" />
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileChange}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={isUploadingAvatar || isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadAvatarButtonClick}
                    disabled={isUploadingAvatar || isSubmitting}
                    className="border-accent text-accent hover:bg-accent/10 hover:text-accent"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="mr-2 h-4 w-4" />
                    )}
                    {isUploadingAvatar ? 'Uploading...' : (avatarFile ? 'Change Picture' : 'Upload Picture')}
                  </Button>
                </div>
                {avatarFile && <FormDescription className="text-xs text-muted-foreground/80 mt-1">New picture selected. Click "Save Changes" to apply.</FormDescription>}
              </FormItem>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <UserCircle className="mr-2 h-5 w-5 text-accent" /> Username (Display Name)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your awesome username"
                        className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground/80">
                      This name will be visible to others.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aboutMe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <Info className="mr-2 h-5 w-5 text-accent" /> About Me
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little about yourself..."
                        className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground/80">
                      Share something interesting about you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <MessageSquare className="mr-2 h-5 w-5 text-accent" /> Status
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What's on your mind?"
                        className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription className="text-xs text-muted-foreground/80">
                      A short status message or mood.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hobbies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <Sparkles className="mr-2 h-5 w-5 text-accent" /> Hobbies
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Reading, Coding, Hiking (comma-separated)"
                        className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground/80">
                      List some of your favorite activities or interests.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                       <Gift className="mr-2 h-5 w-5 text-accent" /> Age Range
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                          <SelectValue placeholder="Select your age range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                        {ageRanges.map((range) => (
                          <SelectItem key={range} value={range} className="hover:bg-accent/20 focus:bg-accent/30">
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                       <PersonStanding className="mr-2 h-5 w-5 text-accent" /> Gender
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                        {genderOptions.map((gender) => (
                          <SelectItem key={gender} value={gender} className="hover:bg-accent/20 focus:bg-accent/30">
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <Hash className="mr-2 h-5 w-5 text-accent" /> Tags
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., TechEnthusiast, Foodie, Bookworm (comma-separated)"
                        className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription className="text-xs text-muted-foreground/80">
                      Keywords that describe you or your interests.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-base">
                      <Heart className="mr-2 h-5 w-5 text-accent" /> Primary Passion
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                          <SelectValue placeholder="Select your main passion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                        {passionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="hover:bg-accent/20 focus:bg-accent/30 flex items-center">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Placeholder for AI generation buttons - to be added later */}
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-8 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard')} // Or router.back() if preferred
            disabled={isSubmitting || isUploadingAvatar}
            className="w-full sm:w-auto border-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || isUploadingAvatar || !currentUser}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {(isSubmitting || isUploadingAvatar) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {(isSubmitting || isUploadingAvatar) ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    