
"use client";

import { useState, useEffect, useCallback, type ChangeEvent, useRef } from 'react';
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
// Select components are already imported above; avoid duplicate import
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Edit3, Sparkles, Gift, Hash, Heart, MessageSquare, Info, Loader2, PersonStanding, UploadCloud, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, type User, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea import
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import type { VibeUserTag } from "@/components/user/user-tag";

// Cloudinary configuration (copied from onboarding/avatar)
const CLOUDINARY_CLOUD_NAME = 'dxqfnat7w';
const CLOUDINARY_API_KEY = '775545995624823';
const CLOUDINARY_UPLOAD_PRESET = 'vibe_app';

const ageRanges = [
  "Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Prefer not to say",
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
  { value: "gaming", label: "Gaming" },
  { value: "sports_fitness", label: "Sports & Fitness" },
  { value: "food_cooking", label: "Food & Cooking" },
  { value: "other", label: "Other" },
];

const profileSchema = z.object({
  displayName: z.string().min(3, { message: "Username must be at least 3 characters." }).optional(),
  aboutMe: z.string().max(500, { message: "About me cannot exceed 500 characters."}).optional().describe("A short bio about yourself"),
  status: z.string().max(100, { message: "Status cannot exceed 100 characters."}).optional().describe("Your current status or mood"),
  hobbies: z.string().optional().describe("Comma-separated list of hobbies"),
  age: z.string().optional(),
  gender: z.string().optional(),
  tags: z.string().optional().describe("Comma-separated list of tags"),
  passion: z.string().optional(),
  vibeTag: z.enum(["AURA","BONE","FORM","INIT","LITE"]).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfileDetails {
  photoURL?: string | null;
  displayName?: string | null;
  aboutMe?: string;
  status?: string;
  hobbies?: string;
  age?: string;
  gender?: string;
  tags?: string;
  passion?: string;
  vibeTag?: VibeUserTag;
  // Privacy settings
  isProfilePublic?: boolean;
  publicFields?: {
    displayName?: boolean;
    aboutMe?: boolean;
    status?: boolean;
    hobbies?: boolean;
    age?: boolean;
    gender?: boolean;
    tags?: boolean;
    passion?: boolean;
    photoURL?: boolean;
  };
}

export default function EditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Privacy settings state
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [publicFields, setPublicFields] = useState({
    displayName: true,
    aboutMe: true,
    status: true,
    hobbies: true,
    age: false,
    gender: false,
    tags: true,
    passion: true,
    photoURL: true,
  });

  // Function to save privacy settings immediately
  const savePrivacySettings = useCallback(async () => {
    if (!currentUser) return;
    
    setIsSavingPrivacy(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, {
        profileDetails: {
          isProfilePublic,
          publicFields
        }
      }, { merge: true });
      console.log('✅ Privacy settings saved');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        variant: "destructive",
        title: "Privacy Settings Error",
        description: "Could not save privacy settings. Please try again.",
      });
    } finally {
      setIsSavingPrivacy(false);
    }
  }, [currentUser, isProfilePublic, publicFields, toast]);

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
      vibeTag: undefined,
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setAvatarPreview(user.photoURL || undefined);
        
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let fetchedProfileDetails: UserProfileDetails = {};

        if (userDocSnap.exists()) {
          fetchedProfileDetails = userDocSnap.data()?.profileDetails || {};
        }
        
        // Load privacy settings
        setIsProfilePublic(fetchedProfileDetails.isProfilePublic ?? false);
        setPublicFields({
          displayName: fetchedProfileDetails.publicFields?.displayName ?? true,
          aboutMe: fetchedProfileDetails.publicFields?.aboutMe ?? true,
          status: fetchedProfileDetails.publicFields?.status ?? true,
          hobbies: fetchedProfileDetails.publicFields?.hobbies ?? true,
          age: fetchedProfileDetails.publicFields?.age ?? false,
          gender: fetchedProfileDetails.publicFields?.gender ?? false,
          tags: fetchedProfileDetails.publicFields?.tags ?? true,
          passion: fetchedProfileDetails.publicFields?.passion ?? true,
          photoURL: fetchedProfileDetails.publicFields?.photoURL ?? true,
        });
        
        form.reset({
          displayName: user.displayName || fetchedProfileDetails.displayName || "",
          aboutMe: fetchedProfileDetails.aboutMe || "",
          status: fetchedProfileDetails.status || "",
          hobbies: fetchedProfileDetails.hobbies || "",
          age: fetchedProfileDetails.age || "",
          gender: fetchedProfileDetails.gender || "",
          tags: fetchedProfileDetails.tags || "",
          passion: fetchedProfileDetails.passion || "",
          vibeTag: fetchedProfileDetails.vibeTag as VibeUserTag | undefined,
        });
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
      if (file.size > 2 * 1024 * 1024) { 
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
    let anyChangesMade = false;

    let authUpdates: { displayName?: string; photoURL?: string } = {};
    if (data.displayName && data.displayName !== currentUser.displayName) {
      authUpdates.displayName = data.displayName;
    }

    let newAvatarUrlFromCloudinary: string | null = null;
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
        if (!response.ok) throw new Error((await response.json()).error?.message || 'Cloudinary upload failed.');
        const cloudinaryData = await response.json();
        if (cloudinaryData.secure_url) {
          newAvatarUrlFromCloudinary = cloudinaryData.secure_url;
          authUpdates.photoURL = newAvatarUrlFromCloudinary || undefined;
        } else throw new Error('Cloudinary did not return a URL.');
      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        toast({ variant: "destructive", title: "Avatar Upload Failed", description: error.message || "Could not upload new avatar." });
        setIsUploadingAvatar(false);
        setIsSubmitting(false);
        return; 
      } finally {
        setIsUploadingAvatar(false);
      }
    }
    
    if (Object.keys(authUpdates).length > 0) {
      try {
        await updateProfile(currentUser, authUpdates);
        anyChangesMade = true;
      } catch (error: any) {
        console.error("Error updating Firebase Auth profile:", error);
        toast({ variant: "destructive", title: "Auth Profile Update Failed", description: error.message });
      }
    }
    
    const profileDetailsToSave: UserProfileDetails = {
      photoURL: newAvatarUrlFromCloudinary || currentUser.photoURL || null, 
      displayName: data.displayName || currentUser.displayName || null,
      aboutMe: data.aboutMe || "",
      status: data.status || "",
      hobbies: data.hobbies || "",
      age: data.age || "",
      gender: data.gender || "",
      tags: data.tags || "",
      passion: data.passion || "",
      vibeTag: data.vibeTag,
      isProfilePublic: isProfilePublic,
      publicFields: publicFields,
    };

    // Filter out undefined values for Firestore compatibility
    const filteredProfileDetails = Object.fromEntries(
      Object.entries(profileDetailsToSave).filter(([_, value]) => value !== undefined)
    ) as UserProfileDetails;

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let existingProfileDetails: UserProfileDetails = {};
      if (userDocSnap.exists() && userDocSnap.data().profileDetails) {
        existingProfileDetails = userDocSnap.data().profileDetails;
      }
      
      let firestoreChangesMade = false;
      for (const key in filteredProfileDetails) {
        if (filteredProfileDetails[key as keyof UserProfileDetails] !== existingProfileDetails[key as keyof UserProfileDetails]) {
          firestoreChangesMade = true;
          break;
        }
      }

      if (firestoreChangesMade) {
        await setDoc(userDocRef, { profileDetails: filteredProfileDetails }, { merge: true });
        anyChangesMade = true;
      }
      
    } catch (error) {
      console.error("Error saving profile details to Firestore:", error);
      toast({ variant: "destructive", title: "Profile Details Save Failed", description: "Could not save all profile details to database." });
    }

    if (anyChangesMade) {
        toast({
          title: "Profile Updated!",
          description: "Your changes have been saved successfully.",
        });
    } else {
        toast({
            title: "No Changes Detected",
            description: "Your profile details are already up-to-date.",
        });
    }

    setIsSubmitting(false);
    // Re-fetch current user to update display immediately
    if (auth.currentUser) {
        await auth.currentUser.reload(); // Reload user data from Firebase Auth
        const updatedUser = auth.currentUser;
        if (updatedUser) {
            setCurrentUser(updatedUser); // Update local state
            setAvatarPreview(updatedUser.photoURL || undefined); // Update preview
            form.reset({ // Reset form with potentially updated values
                displayName: updatedUser.displayName || profileDetailsToSave.displayName || "",
                aboutMe: profileDetailsToSave.aboutMe || "",
                status: profileDetailsToSave.status || "",
                hobbies: profileDetailsToSave.hobbies || "",
                age: profileDetailsToSave.age || "",
                gender: profileDetailsToSave.gender || "",
                tags: profileDetailsToSave.tags || "",
                passion: profileDetailsToSave.passion || "",
                vibeTag: profileDetailsToSave.vibeTag,
            });
            
            // Update privacy settings state to reflect saved values
            setIsProfilePublic(profileDetailsToSave.isProfilePublic ?? false);
            setPublicFields({
              displayName: profileDetailsToSave.publicFields?.displayName ?? true,
              aboutMe: profileDetailsToSave.publicFields?.aboutMe ?? true,
              status: profileDetailsToSave.publicFields?.status ?? true,
              hobbies: profileDetailsToSave.publicFields?.hobbies ?? true,
              age: profileDetailsToSave.publicFields?.age ?? false,
              gender: profileDetailsToSave.publicFields?.gender ?? false,
              tags: profileDetailsToSave.publicFields?.tags ?? true,
              passion: profileDetailsToSave.publicFields?.passion ?? true,
              photoURL: profileDetailsToSave.publicFields?.photoURL ?? true,
            });
        }
    }
    setAvatarFile(null); // Clear selected file
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser) {
   return <SplashScreenDisplay />; 
 }

  return (
    <div className="flex h-full items-center justify-center overflow-hidden p-4">
      <Card className="flex flex-col w-full max-w-lg bg-card border-border/50 shadow-xl h-[90vh]">
        <CardHeader className="shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Edit3 className="mr-3 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 4px hsl(var(--primary)/0.6)' }}>
                Edit Your Profile
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} className="sm:hidden">
              <ArrowLeft className="h-5 w-5 text-accent"/>
            </Button>
          </div>
          <CardDescription className="text-muted-foreground pt-1 text-sm sm:text-base">
            Update your profile information, username, and avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden"> 
          <ScrollArea className="h-full">
            <div className="p-6 pb-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">

                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
                      <UserCircle className="mr-2 h-5 w-5 text-accent" /> Profile Picture
                    </FormLabel>
                    <div className="flex items-center gap-3 sm:gap-4 mt-2">
                      <Avatar
                        className={`h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary shadow-md ${isUploadingAvatar ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} transition-opacity`}
                        onClick={handleUploadAvatarButtonClick}
                      >
                        <AvatarImage src={avatarPreview} alt="User Avatar Preview" className="object-cover"/>
                        <AvatarFallback className="bg-muted hover:bg-muted/80">
                          <UserCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/70" />
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
                        className="border-accent text-accent hover:bg-accent/10 hover:text-accent text-xs sm:text-sm py-2 px-3"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="mr-1.5 h-4 w-4" />
                        )}
                        {isUploadingAvatar ? 'Uploading...' : (avatarFile ? 'Change' : 'Upload')}
                      </Button>
                    </div>
                    {avatarFile && <FormDescription className="text-xs text-muted-foreground/80 mt-1">New picture selected. Click "Save Changes" to apply.</FormDescription>}
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                    name="vibeTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
                          <Hash className="mr-2 h-5 w-5 text-accent" /> Tag
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                              <SelectValue placeholder="Select your tag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                            {(["AURA","BONE","FORM","INIT","LITE"] as VibeUserTag[]).map((tag) => (
                              <SelectItem key={tag} value={tag} className="hover:bg-accent/20 focus:bg-accent/30">
                                <div className="flex items-center gap-2">
                                  <Image src={`/${tag}.png`} alt={`${tag} icon`} width={18} height={18} />
                                  <span>{tag}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs text-muted-foreground/80">
                          Choose one of the five Vibe tags. You can change this anytime.
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
                          <Info className="mr-2 h-5 w-5 text-accent" /> About Me
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a little about yourself..."
                            className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground min-h-[80px] sm:min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground/80">
                          Share something interesting about you (max 500 characters).
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                          A short status message or mood (max 100 characters).
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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
                        <FormLabel className="text-muted-foreground flex items-center text-sm sm:text-base">
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

                  {/* Privacy Settings Section */}
                  <div className="space-y-6 pt-6 border-t border-border/50">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-accent" />
                      <h3 className="text-lg font-semibold text-foreground">Privacy Settings</h3>
                      <span className="text-xs text-muted-foreground">• Individual field visibility</span>
                      {isSavingPrivacy && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      For general privacy controls (who can DM you, profile visibility), visit <span className="text-accent hover:underline cursor-pointer" onClick={() => router.push('/settings/advanced')}>Advanced Settings</span>.
                    </p>
                    
                    {/* Profile Visibility Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {isProfilePublic ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-orange-500" />
                          )}
                          <span className="font-medium text-foreground">
                            {isProfilePublic ? 'Public Profile' : 'Private Profile'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isProfilePublic 
                            ? 'Your profile is visible to other users' 
                            : 'Your profile is hidden from other users'
                          }
                        </p>
                      </div>
                      <Switch
                        checked={isProfilePublic}
                        onCheckedChange={(checked) => {
                          setIsProfilePublic(checked);
                          // Save immediately
                          setTimeout(() => savePrivacySettings(), 100);
                        }}
                        className="data-[state=checked]:bg-accent"
                      />
                    </div>

                    {/* Field Visibility Controls */}
                    {isProfilePublic && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-foreground">Choose what to show publicly:</h4>
                        
                        <div className="grid gap-3">
                          {/* Display Name */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <UserCircle className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Display Name</span>
                            </div>
                            <Switch
                              checked={publicFields.displayName}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, displayName: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Profile Photo */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={avatarPreview} />
                                <AvatarFallback className="text-xs">P</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-foreground">Profile Photo</span>
                            </div>
                            <Switch
                              checked={publicFields.photoURL}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, photoURL: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* About Me */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Info className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">About Me</span>
                            </div>
                            <Switch
                              checked={publicFields.aboutMe}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, aboutMe: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Status */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <MessageSquare className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Status</span>
                            </div>
                            <Switch
                              checked={publicFields.status}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, status: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Hobbies */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Sparkles className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Hobbies</span>
                            </div>
                            <Switch
                              checked={publicFields.hobbies}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, hobbies: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Age */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Gift className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Age Range</span>
                            </div>
                            <Switch
                              checked={publicFields.age}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, age: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Gender */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <PersonStanding className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Gender</span>
                            </div>
                            <Switch
                              checked={publicFields.gender}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, gender: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Tags */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Hash className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Tags</span>
                            </div>
                            <Switch
                              checked={publicFields.tags}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, tags: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>

                          {/* Primary Passion */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/30">
                            <div className="flex items-center space-x-3">
                              <Heart className="h-4 w-4 text-accent" />
                              <span className="text-sm text-foreground">Primary Passion</span>
                            </div>
                            <Switch
                              checked={publicFields.passion}
                              onCheckedChange={(checked) => {
                                setPublicFields(prev => ({ ...prev, passion: checked }));
                                setTimeout(() => savePrivacySettings(), 100);
                              }}
                              className="data-[state=checked]:bg-accent"
                            />
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground/80 p-3 bg-muted/30 rounded-lg">
                          <strong>Note:</strong> When your profile is private, other users cannot see any of your information. 
                          When public, only the fields you enable above will be visible to others.
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 pb-6 shrink-0 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/settings')}
            disabled={isSubmitting || isUploadingAvatar}
            className="w-full sm:w-auto border-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || isUploadingAvatar || !currentUser}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm sm:text-base py-2.5 sm:py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {(isSubmitting || isUploadingAvatar) && <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />}
            {(isSubmitting || isUploadingAvatar) ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
    
