"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User 
} from "firebase/auth";
import SplashScreenDisplay from "@/components/common/splash-screen-display";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is already logged in, redirect to dashboard
        router.replace('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await sendPasswordResetEmail(auth, data.email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setEmailSent(true);
      setSentEmail(data.email);

      toast({
        title: "Password Reset Email Sent!",
        description: "Please check your email for password reset instructions.",
        duration: 5000,
      });

    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to send password reset email. Please try again.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address.";
            form.setError("email", { 
              type: "manual", 
              message: "No account found with this email address." 
            });
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            form.setError("email", { 
              type: "manual", 
              message: "Please enter a valid email address." 
            });
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many password reset requests. Please try again later.";
            break;
          default:
            errorMessage = "Failed to send password reset email. Please try again.";
        }
      }
      
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: errorMessage,
      });
    }
  };

  const handleResendEmail = async () => {
    if (!sentEmail) return;
    
    try {
      await sendPasswordResetEmail(auth, sentEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      toast({
        title: "Email Resent!",
        description: "Password reset email has been sent again.",
        duration: 3000,
      });

    } catch (error: any) {
      console.error("Resend error:", error);
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: "Failed to resend email. Please try again.",
      });
    }
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (emailSent) {
    return (
      <AuthFormWrapper
        title="Check Your Email"
        description="We've sent password reset instructions to your email."
        footerContent={
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link 
              href="/login" 
              className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors"
            >
              Back to Login
            </Link>
          </p>
        }
      >
        <div className="space-y-6">
          {/* Success card */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-lg text-foreground">
                Reset Email Sent!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                We sent password reset instructions to{" "}
                <span className="font-medium text-accent">
                  {sentEmail}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Click the password reset link in your email</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Create a new password when prompted</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Return to login with your new password</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Back to Login
            </Button>

            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full"
            >
              Resend Reset Email
            </Button>
          </div>

          {/* Help text */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Check your spam folder if you don't see the email within a few minutes.
            </p>
          </div>
        </div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper
      title="Reset Your Password"
      description="Enter your email to receive password reset instructions."
      footerContent={
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link 
            href="/login" 
            className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors"
          >
            Back to Login
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
                <FormLabel className="text-muted-foreground">Email Address</FormLabel>
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

          <Button 
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-3
                       shadow-[0_0_10px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       focus:shadow-[0_0_18px_hsl(var(--primary)/0.8)]
                       transition-all duration-300 ease-in-out transform hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary"
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {form.formState.isSubmitting ? "Sending Reset Email..." : "Send Reset Email"}
          </Button>
        </form>
      </Form>

      {/* Additional help */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link 
            href="/create-account" 
            className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthFormWrapper>
  );
}