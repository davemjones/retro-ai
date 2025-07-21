"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const [sessionConflict, setSessionConflict] = useState(false);

  // Monitor for session conflicts or unexpected changes
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Check if session has changed unexpectedly
      const storedUserId = sessionStorage.getItem('current-user-id');
      
      if (storedUserId && storedUserId !== session.user.id) {
        console.warn('Session conflict detected: User ID changed unexpectedly');
        setSessionConflict(true);
      } else {
        // Store current user ID for conflict detection
        sessionStorage.setItem('current-user-id', session.user.id);
        setSessionConflict(false);
      }
    }
  }, [session, status]);

  const handleSignOut = async () => {
    // Clear session storage on explicit sign out
    sessionStorage.removeItem('current-user-id');
    await signOut({ callbackUrl: "/" });
  };

  const handleSessionConflictResolve = async () => {
    console.log('Resolving session conflict by signing out');
    sessionStorage.removeItem('current-user-id');
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex flex-1 items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-xl">
            Retro AI
          </Link>

          <nav className="flex items-center gap-6">
            {sessionConflict && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <span>Session conflict detected</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSessionConflictResolve}
                >
                  Resolve
                </Button>
              </div>
            )}
            {status === "authenticated" && session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {session.user.name?.charAt(0).toUpperCase() || 
                         session.user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session.user.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-4">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}