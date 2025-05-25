
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
import { BookOpen, Gift, Hash, Heart, UserCircle, Palette, Film, Music, Plane, Code, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

const interestsSchema = z.object({
  hobbies: z.string().min(1, { message: "Please enter at least one hobby." }).describe("Comma-separated list of hobbies"),
  age: z.string().min(1, { message: "Please select your age range." }),
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
];

const passionOptions = [
  { value: "art_design", label: "Art & Design", icon: <Palette className="mr-2 h-4 w-4" /> },
  { value: "movies_tv", label: "Movies & TV", icon: <Film className="mr-2 h-4 w-4" /> },
  { value: "music", label: "Music", icon: <Music className="mr-2 h-4 w-4" /> },
  { value: "reading", label: "Reading", icon: <BookOpen className="mr-2 h-4 w-4" /> },
  { value: "technology", label: "Technology", icon: <Code className="mr-2 h-4 w-4" /> },
  { value: "travel", label: "Travel", icon: <Plane className="mr-2 h-4 w-4" /> },
  { value: "other", label: "Other", icon: <UserCircle className="mr-2 h-4 w-4" /> },
];

export default function InterestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsCheckingAuth(false);
      if (user) {
        const onboardingComplete = localStorage.getItem(`onboardingComplete_${user.uid}`);
        if (onboardingComplete === 'true') {
          router.replace('/dashboard');
        }
      } else {
        // If no user, redirect to login, as onboarding requires authentication
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
      tags: "",
      passion: "",
    },
  });

  const onSubmit = (data: InterestsFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      router.push('/login');
      return;
    }
    setIsSubmitting(true);
    // Simulate saving data
    console.log("Interests data for user:", currentUser.uid, data);

    // Mark onboarding as complete in localStorage
    localStorage.setItem(`onboardingComplete_${currentUser.uid}`, 'true');

    toast({
      title: "Profile Details Updated!",
      description: "Your interests have been saved.",
    });
    
    // Simulate a short delay before redirecting
    setTimeout(() => {
      router.push('/dashboard'); 
      setIsSubmitting(false);
    }, 1000);
  };

  const handleSkip = () => {
    if (!currentUser) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        router.push('/login');
        return;
    }
    // Mark onboarding as complete even if skipped, so they don't see it again.
    // Alternatively, you might want a different flag or logic for skipped onboarding.
    localStorage.setItem(`onboardingComplete_${currentUser.uid}`, 'true'); 
    toast({
      title: 'Skipping Profile Details',
      description: 'Proceeding to the dashboard. You can complete your profile later.',
    });
    router.push('/dashboard');
  };
  
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    // Should have been redirected by useEffect, but as a fallback
   return (
     <div className="flex items-center justify-center min-h-screen bg-background">
       <p>Redirecting to login...</p>
     </div>
   );
 }


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 selection:bg-primary/30 selection:text-primary-foreground">
      <Card className="w-full max-w-lg bg-card border-border/50 shadow-[0_0_25px_hsl(var(--primary)/0.2),_0_0_10px_hsl(var(--accent)/0.1)]">
        <CardHeader className="text-center pt-6 pb-4">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary)/0.7)' }}>
            Share Your vibe
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Tell us a bit more about yourself to personalize your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="hobbies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center">
                      <Palette className="mr-2 h-5 w-5 text-accent" /> Hobbies
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
                    <FormLabel className="text-muted-foreground flex items-center">
                       <Gift className="mr-2 h-5 w-5 text-accent" /> Age Range
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
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center">
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
                    <FormLabel className="text-muted-foreground flex items-center">
                      <Heart className="mr-2 h-5 w-5 text-accent" /> Primary Passion
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-6">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || !currentUser}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Profile & Continue'}
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
