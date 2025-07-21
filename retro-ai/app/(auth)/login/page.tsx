"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Get error from URL params (from middleware redirects) using window.location
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setError(urlParams.get('error'));
    }
  }, []);

  // Get security error message
  const getSecurityErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case 'SecurityThreat':
        return {
          title: 'Security Alert',
          message: 'Your session was terminated due to suspicious activity. Please log in again.',
          icon: <Shield className="h-4 w-4" />,
          variant: 'destructive' as const
        };
      case 'SessionExpired':
        return {
          title: 'Session Expired',
          message: 'Your session has expired for security reasons. Please log in again.',
          icon: <AlertTriangle className="h-4 w-4" />,
          variant: 'default' as const
        };
      case 'SessionValidationError':
        return {
          title: 'Session Error',
          message: 'There was an issue validating your session. Please log in again.',
          icon: <AlertTriangle className="h-4 w-4" />,
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  const securityError = getSecurityErrorMessage(error);

  // Automatically sign out existing session when component mounts
  // This prevents session bleeding between different user logins
  useEffect(() => {
    if (status === "authenticated" && session) {
      console.log("Existing session detected, signing out to prevent session bleeding");
      setIsSigningOut(true);
      signOut({ redirect: false }).then(() => {
        setIsSigningOut(false);
        console.log("Previous session cleared");
      });
    }
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Explicit sign out before sign in to prevent session bleeding
      console.log("Ensuring clean session before login");
      await signOut({ redirect: false });
      
      // Short delay to ensure signOut completes
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else if (result?.ok) {
        console.log("Login successful, redirecting to dashboard");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {securityError && (
              <Alert variant={securityError.variant}>
                <div className="flex items-center gap-2">
                  {securityError.icon}
                  <div>
                    <p className="font-medium">{securityError.title}</p>
                    <AlertDescription>{securityError.message}</AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading || isSigningOut}>
              {isSigningOut ? "Clearing previous session..." : isLoading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}