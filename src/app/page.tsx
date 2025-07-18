"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Check for existing session silently in background
    const checkExistingSession = async () => {
      try {
        const session = await getSession();
        if (session && !isRedirecting) {
          setIsRedirecting(true);
          router.push("/orders");
        }
      } catch (error) {
        // Ignore errors, just show sign-in form
      }
    };

    // Small delay to let the UI render first
    const timer = setTimeout(checkExistingSession, 100);
    return () => clearTimeout(timer);
  }, [router, isRedirecting]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn("discord", { callbackUrl: "/orders" });
    } catch (error) {
      setIsSigningIn(false);
    }
  };

  // Show loading only when redirecting authenticated users
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Welcome back! Redirecting to orders...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login page for unauthenticated users
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">FarmyFishFry</CardTitle>
          <CardDescription>
            Welcome to the BitCraft trading platform. Sign in with Discord to
            get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all duration-200 min-h-[44px]"
            size="lg"
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting to Discord...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Sign in with Discord
              </>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Join the FarmFishFry cohort trading community
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
