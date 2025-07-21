"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Shield } from "lucide-react";

interface LoginFormProps {
  className?: string;
  showTitle?: boolean;
  showSignUpLink?: boolean;
}

export function LoginForm({ 
  className = "", 
  showTitle = true, 
  showSignUpLink = true 
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
    <Card className={`w-full max-w-sm ${className}`}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
      )}
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
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
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div>
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
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
          {showSignUpLink && (
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="underline">
                Sign up
              </Link>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}