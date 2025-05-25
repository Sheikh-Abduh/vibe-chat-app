
"use client";

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { UserCircle, Edit3, Sparkles, Gift, Hash, Heart, MessageSquare, Info, Loader2, PersonStanding } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import Link from 'next/link';

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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
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
        // Load existing data from localStorage
        const storedAboutMe = localStorage.getItem(`userProfile_aboutMe_${user.uid}`);
        const storedStatus = localStorage.getItem(`userProfile_status_${user.uid}`);
        const storedHobbies = localStorage.getItem(`userInterests_hobbies_${user.uid}`);
        const storedAge = localStorage.getItem(`userInterests_age_${user.uid}`);
        const storedGender = localStorage.getItem(`userInterests_gender_${user.uid}`);
        const storedTags = localStorage.getItem(`userInterests_tags_${user.uid}`);
        const storedPassion = localStorage.getItem(`userInterests_passion_${user.uid}`);

        form.reset({
          aboutMe: storedAboutMe || "",
          status: storedStatus || "",
          hobbies: storedHobbies || "",
          age: storedAge || "",
          gender: storedGender || "",
          tags: storedTags || "",
          passion: storedPassion || "",
        });
        setIsCheckingAuth(false);
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router, form]);

  const onSubmit = (data: ProfileFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);

    // Save updated data to localStorage
    localStorage.setItem(`userProfile_aboutMe_${currentUser.uid}`, data.aboutMe || "");
    localStorage.setItem(`userProfile_status_${currentUser.uid}`, data.status || "");
    localStorage.setItem(`userInterests_hobbies_${currentUser.uid}`, data.hobbies || "");
    localStorage.setItem(`userInterests_age_${currentUser.uid}`, data.age || "");
    localStorage.setItem(`userInterests_gender_${currentUser.uid}`, data.gender || "");
    localStorage.setItem(`userInterests_tags_${currentUser.uid}`, data.tags || "");
    localStorage.setItem(`userInterests_passion_${currentUser.uid}`, data.passion || "");
    
    toast({
      title: "Profile Updated!",
      description: "Your changes have been saved successfully.",
    });
    
    setTimeout(() => {
      setIsSubmitting(false);
      // Consider a more elegant state update for AppLayout if direct reload is too jarring
      // window.location.reload(); 
    }, 500);
  };
  
  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser) {
   return <SplashScreenDisplay />;
 }

  return (
    <div className="space-y-8 px-4">
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
            Update your profile information. This will be visible to others in the community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-8 pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            disabled={isSubmitting}
            className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive
                       shadow-[0_0_8px_hsl(var(--destructive)/0.4)] hover:shadow-[0_0_12px_hsl(var(--destructive)/0.6)]
                       transition-all duration-300 ease-in-out"
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || !currentUser}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

