"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { Mail, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  sendEmailVerification, 
  signOut,
  type User 
} from "firebase/auth";
import SplashScreenDisplay from "@/components/common/splash-screen-display";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lastUserEmail, setLastUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setLastUserEmail(user.email);
        // If email is already verified, redirect to onboarding
        if (user.emailVerified) {
          toast({
            title: "Email Verified!",
            description: "Your email has been successfully verified. Continuing to setup...",
            duration: 3000,
          });
          router.replace('/onboarding/avatar');
        }
      } else {
        // Check if we have a stored email from a recent signup attempt
        const storedEmail = localStorage.getItem('pendingVerificationEmail');
        if (storedEmail) {
          setLastUserEmail(storedEmail);
        } else {
          // No user signed in and no stored email, redirect to login
          router.replace('/login');
        }
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!currentUser && !lastUserEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in again to resend verification email.",
      });
      router.push('/login');
      return;
    }

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please sign in again to resend verification email.",
      });
      router.push('/login');
      return;
    }

    setIsResending(true);
    try {
      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      toast({
        title: "Verification Email Sent!",
        description: "Please check your email and click the verification link.",
        duration: 5000,
      });

      // Set cooldown period of 60 seconds
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Resend verification error:", error);
      let errorMessage = "Failed to send verification email. Please try again.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/too-many-requests':
            errorMessage = "Too many requests. Please wait before trying again.";
            setResendCooldown(120); // 2 minute cooldown for rate limiting
            break;
          case 'auth/invalid-user-token':
          case 'auth/user-token-expired':
            errorMessage = "Your session has expired. Please log in again.";
            break;
          default:
            errorMessage = "Failed to send verification email. Please try again.";
        }
      }
      
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "Please sign in again to check verification status.",
      });
      router.push('/login');
      return;
    }

    setIsCheckingVerification(true);
    try {
      // Reload user to get latest email verification status
      await currentUser.reload();
      const refreshedUser = auth.currentUser;

      if (refreshedUser?.emailVerified) {
        // Clear stored email since verification is complete
        localStorage.removeItem('pendingVerificationEmail');
        
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified. Continuing to setup...",
          duration: 3000,
        });
        router.push('/onboarding/avatar');
      } else {
        toast({
          title: "Not Verified Yet",
          description: "Your email hasn't been verified yet. Please check your email and click the verification link.",
          duration: 4000,
        });
      }
    } catch (error: any) {
      console.error("Check verification error:", error);
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "Failed to check verification status. Please try again.",
      });
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  if (isCheckingAuth) {
    return <SplashScreenDisplay />;
  }

  if (!currentUser && !lastUserEmail) {
    return null; // Will redirect to login
  }

  return (
    <AuthFormWrapper
      title="Verify Your Email"
      description="We've sent a verification email to your inbox."
      footerContent={
        <p className="text-sm text-muted-foreground">
          Want to use a different email?{" "}
          <button 
            onClick={handleSignOut}
            className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors"
          >
            Sign out and try again
          </button>
        </p>
      }
    >
      <div className="space-y-6">
        {/* Email verification status card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 rounded-full bg-accent/10">
              <Mail className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-lg text-foreground">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              We sent a verification link to{" "}
              <span className="font-medium text-accent">
                {currentUser?.email || lastUserEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Click the verification link in your email</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Return to this page and click "I've Verified My Email"</span>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>Check your spam folder if you don't see the email</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleCheckVerification}
            disabled={isCheckingVerification}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {isCheckingVerification && (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isCheckingVerification ? "Checking..." : "I've Verified My Email"}
          </Button>

          <Button
            onClick={handleResendVerification}
            disabled={isResending || resendCooldown > 0}
            variant="outline"
            className="w-full"
          >
            {isResending && (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isResending
              ? "Sending..."
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend Verification Email"
            }
          </Button>
        </div>

        {/* Help text */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Having trouble?{" "}
            <Link 
              href="/login" 
              className="font-medium text-accent hover:text-accent/80 hover:underline underline-offset-4 transition-colors"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </AuthFormWrapper>
  );
}