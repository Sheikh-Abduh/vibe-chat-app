
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence 
} from "firebase/auth";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      // Set Firebase Auth persistence based on "Remember Me" checkbox
      const persistence = data.rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Login Successful!",
        description: "Welcome back. Let's set up your profile.",
      });
      router.push('/onboarding/avatar'); 
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      // Handle Firebase specific auth errors
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential': // More generic error for email/password mismatch
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "The email address you entered is not valid.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
            break;
          default:
            errorMessage = "Login failed. Please try again.";
        }
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    }
  };

  return (
    <AuthFormWrapper
      title="Welcome Back"
      description="Log in to continue your vibe."
      footerContent={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/create-account" className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors">
            Create one
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-input border-border/80 focus:border-transparent focus:ring-2 focus:ring-accent placeholder:text-muted-foreground/70 text-foreground selection:bg-primary/30 selection:text-primary-foreground"
                      {...field}
                      autoComplete="current-password"
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
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-accent data-[state=checked]:border-accent border-muted-foreground focus:ring-accent focus:ring-offset-background"
                  />
                </FormControl>
                <FormLabel className="font-normal text-muted-foreground">
                  Remember me
                </FormLabel>
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
            {form.formState.isSubmitting ? "Logging In..." : "Log In"}
          </Button>
        </form>
      </Form>
    </AuthFormWrapper>
  );
}
