
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Gift, Hash, Heart, Palette, Film, Music, Plane, Code, Loader2, PersonStanding } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import SplashScreenDisplay from '@/components/common/splash-screen-display';
import { ScrollArea } from '@/components/ui/scroll-area';

const interestsSchema = z.object({
  hobbies: z.string().min(1, { message: "Please enter at least one hobby." }).describe("Comma-separated list of hobbies"),
  age: z.string().min(1, { message: "Please select your age range." }),
  gender: z.string().min(1, { message: "Please select your gender." }),
  tags: z.string().min(1, { message: "Please enter at least one tag." }).describe("Comma-separated list of tags"),
  passion: z.string().min(1, { message: "Please select your primary passion." }),
});

type InterestsFormValues = z.infer<typeof interestsSchema>;

const ageRanges = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
  "Prefer not to say",
];

const genderOptions = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
  "Other",
];

const passionOptions = [
  { value: "art_design", label: "Art & Design", icon: <Palette className="mr-2 h-4 w-4" /> },
  { value: "movies_tv", label: "Movies & TV", icon: <Film className="mr-2 h-4 w-4" /> },
  { value: "music", label: "Music", icon: <Music className="mr-2 h-4 w-4" /> },
  { value: "reading", label: "Reading", icon: <BookOpen className="mr-2 h-4 w-4" /> },
  { value: "technology", label: "Technology", icon: <Code className="mr-2 h-4 w-4" /> },
  { value: "travel", label: "Travel", icon: <Plane className="mr-2 h-4 w-4" /> },
  { value: "gaming", label: "Gaming", icon: <Palette className="mr-2 h-4 w-4" /> }, 
  { value: "sports_fitness", label: "Sports & Fitness", icon: <Palette className="mr-2 h-4 w-4" /> },
  { value: "food_cooking", label: "Food & Cooking", icon: <Palette className="mr-2 h-4 w-4" /> },
  { value: "other", label: "Other", icon: <Palette className="mr-2 h-4 w-4" /> },
];

export default function InterestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          // If onboarding is not complete, but interests were previously saved to Firestore, load them.
          if (userDocSnap.exists() && userDocSnap.data().profileDetails) {
            const { hobbies, age, gender, tags, passion } = userDocSnap.data().profileDetails;
            form.reset({
              hobbies: hobbies || "",
              age: age || "",
              gender: gender || "",
              tags: tags || "",
              passion: passion || "",
            });
          }
          setIsCheckingAuth(false);
        }
      } else {
        router.replace('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<InterestsFormValues>({
    resolver: zodResolver(interestsSchema),
    defaultValues: {
      hobbies: "",
      age: "",
      gender: "",
      tags: "",
      passion: "",
    },
  });

  const onSubmit = async (data: InterestsFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    
    const profileDetailsToSave = {
        hobbies: data.hobbies,
        age: data.age,
        gender: data.gender,
        tags: data.tags,
        passion: data.passion,
    };

    try {
        const userDocRef = doc(db, "users", currentUser.uid);
        // Merge with existing profileDetails if any, to not overwrite things like photoURL
        const userDocSnap = await getDoc(userDocRef);
        const existingProfileDetails = userDocSnap.exists() ? userDocSnap.data().profileDetails : {};
        
        await setDoc(userDocRef, { 
            profileDetails: { ...existingProfileDetails, ...profileDetailsToSave } 
        }, { merge: true });
        
        toast({
          title: "Interests Saved!",
          description: "Let's customize your app's theme.",
        });
        
        router.push('/onboarding/theme'); 
    } catch (error) {
        console.error("Error saving interests to Firestore:", error);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save interests. Please try again." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!currentUser) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        router.push('/login');
        return;
    }
     setIsSubmitting(true); 
    const profileDetailsToSave = {
        hobbies: "Not set",
        age: "Not set",
        gender: "Not set",
        tags: "Not set",
        passion: "Not set",
    };
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const existingProfileDetails = userDocSnap.exists() ? userDocSnap.data().profileDetails : {};

      await setDoc(userDocRef, { 
        profileDetails: { ...existingProfileDetails, ...profileDetailsToSave } 
      }, { merge: true });
      toast({
        title: 'Skipping Interests',
        description: 'Proceeding to theme selection. You can update interests later.',
      });
      router.push('/onboarding/theme');
    } catch (error) {
      console.error("Error setting default interests on skip:", error);
      toast({ variant: "destructive", title: "Skip Failed", description: "Could not proceed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
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
            Share Your vibe
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Tell us a bit more about yourself to personalize your experience. Fields with <span className="text-destructive">*</span> are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0"> 
          <ScrollArea className="h-full">
            <div className="px-6 pt-2 pb-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center">
                          <Gift className="mr-2 h-5 w-5 text-accent" /> Age Range <span className="text-destructive ml-1">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <FormLabel className="text-muted-foreground flex items-center">
                          <PersonStanding className="mr-2 h-5 w-5 text-accent" /> Gender <span className="text-destructive ml-1">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    name="hobbies"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center">
                          <Palette className="mr-2 h-5 w-5 text-accent" /> Hobbies <span className="text-destructive ml-1">*</span>
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
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground flex items-center">
                          <Hash className="mr-2 h-5 w-5 text-accent" /> Tags <span className="text-destructive ml-1">*</span>
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
                        <FormLabel className="text-muted-foreground flex items-center">
                          <Heart className="mr-2 h-5 w-5 text-accent" /> Primary Passion <span className="text-destructive ml-1">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground selection:bg-primary/30 selection:text-primary-foreground">
                              <SelectValue placeholder="Select your main passion" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                            {passionOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="hover:bg-accent/20 focus:bg-accent/30 flex items-center">
                                {option.icon} {option.label}
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
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-6 pb-6 shrink-0">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || !currentUser}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting || !currentUser}
            className="w-full text-muted-foreground hover:text-accent/80"
          >
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    
