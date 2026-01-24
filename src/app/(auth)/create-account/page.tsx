
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { useToast } from "@/hooks/use-toast";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { Mail, LockKeyhole, User, Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import SplashScreenDisplay from "@/components/common/splash-screen-display";
import type { UiScale } from '@/components/theme/theme-provider';
import Image from "next/image";
import type { VibeUserTag } from "@/components/user/user-tag";

const createAccountSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(7, { message: "Password must be at least 7 characters." }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
  vibeTag: z.enum(["AURA","BONE","FORM","INIT","LITE"], { required_error: "Select a tag" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type CreateAccountFormValues = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is authenticated but email not verified, redirect to verify email
        if (!user.emailVerified) {
          router.replace('/verify-email');
          return;
        }
        
        // Check Firestore for onboarding complete as the source of truth
        const userDocRef = doc(db, "users", user.uid);
        getDoc(userDocRef).then(userDocSnap => {
          if (userDocSnap.exists() && userDocSnap.data().appSettings?.onboardingComplete === true) {
            router.replace('/dashboard');
          } else {
            router.replace('/onboarding/avatar');
          }
        }).catch(() => {
          // If error fetching doc, fallback or stay, here we go to onboarding
          router.replace('/onboarding/avatar');
        });
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);


  const form = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      vibeTag: undefined as unknown as VibeUserTag,
    },
  });

  const onSubmit = async (data: CreateAccountFormValues) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.username });

      const userDocRef = doc(db, "users", user.uid);

      // Default to Nebula color palette for new users
      const defaultColorPalette = 'Nebula';
      const defaultThemePrimaryValue = '250 84% 54%'; // Nebula - Cosmic purple
      const defaultThemePrimaryFgValue = '0 0% 100%';
      const defaultThemeSecondaryValue = '180 100% 50%'; // Nebula - Bright teal
      const defaultThemeSecondaryFgValue = '220 26% 14%';
      const defaultUiScaleValue: UiScale = 'default';
      const defaultThemeModeValue: 'light' | 'dark' = 'dark';

      const initialAppSettings = {
        onboardingComplete: false,
        themeMode: defaultThemeModeValue,
        colorPalette: defaultColorPalette, // New palette system
        // Legacy compatibility fields
        themePrimaryAccent: defaultThemePrimaryValue,
        themePrimaryAccentFg: defaultThemePrimaryFgValue,
        themeSecondaryAccent: defaultThemeSecondaryValue,
        themeSecondaryAccentFg: defaultThemeSecondaryFgValue,
        uiScale: defaultUiScaleValue,
        communityJoinPreference: 'no',
      };

      const initialProfileDetails = {
        displayName: data.username,
        photoURL: user.photoURL || null,
        note: "Add a quick note",
        about: "What's on your mind?",
        hobbies: "Not set",
        age: "Not set",
        gender: "Not set",
        tags: "Not set",
        passion: "Not set",
        vibeTag: data.vibeTag,
      };

      const initialAdvancedSettings = {
        dmPreference: "anyone",
        profileVisibility: "public",
      };
      
      const contentNotificationSettingsKeys = ['messages_enabled', 'friendRequests_enabled', 'messageRequests_enabled', 'communityInvites_enabled'];
      const deliveryMethodSettingsKeys = ['delivery_email_enabled', 'delivery_push_enabled', 'delivery_inApp_enabled', 'delivery_notificationCentre_enabled'];
      const initialNotificationSettings: Record<string, boolean> = {};
      [...contentNotificationSettingsKeys, ...deliveryMethodSettingsKeys].forEach(key => {
        initialNotificationSettings[key] = true;
      });

      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        profileDetails: initialProfileDetails,
        appSettings: initialAppSettings,
        advancedSettings: initialAdvancedSettings,
        notificationSettings: initialNotificationSettings,
      });
      
      // Send email verification
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login`, // Redirect URL after verification
        handleCodeInApp: false,
      });
      
      toast({
        title: "Account Created Successfully!",
        description: "Please check your email and verify your account before logging in.",
        duration: 6000,
      });
      
      // Store email for verification flow in case user gets signed out
      localStorage.setItem('pendingVerificationEmail', data.email);
      
      // Redirect to email verification page instead of onboarding
      router.push('/verify-email'); 
    } catch (error: any) {
      console.error("Create account error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email address is already registered. Try logging in.";
            form.setError("email", { type: "manual", message: errorMessage });
            break;
          case 'auth/invalid-email':
            errorMessage = "The email address you entered is not valid.";
            form.setError("email", { type: "manual", message: errorMessage });
            break;
          case 'auth/weak-password':
            errorMessage = "Your password is too weak. Please choose a stronger one (at least 7 characters).";
            form.setError("password", { type: "manual", message: errorMessage });
            break;
          default:
            errorMessage = "Account creation failed. Please try again.";
        }
      }
      toast({
        variant: "destructive",
        title: "Account Creation Failed",
        description: errorMessage,
      });
    }
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  return (
    <AuthFormWrapper
      title="Join vibe"
      description="Create your account to start vibing."
      footerContent={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors">
            Log In
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Username</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      placeholder="your_username" 
                      className="pl-10 bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                      {...field} 
                      autoComplete="username"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vibeTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Choose your tag</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className="bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent text-foreground">
                      <SelectValue placeholder="Select a tag" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border/80 text-popover-foreground">
                      {(["AURA","BONE","FORM","INIT","LITE"] as VibeUserTag[]).map((tag) => (
                        <SelectItem key={tag} value={tag} className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Image src={`/${tag}.png`} alt={`${tag} icon`} width={18} height={18} />
                            <span>{tag}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                      {...field}
                      autoComplete="email"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="•••••••• (min. 7 characters)"
                      className="pl-10 pr-10 bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                      {...field}
                      autoComplete="new-password"
                    />
                     <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                     <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                      {...field}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {form.formState.isSubmitting && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>}
            {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </Form>
    </AuthFormWrapper>
  );
}
