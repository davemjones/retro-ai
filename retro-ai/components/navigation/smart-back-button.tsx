"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SmartBackButtonProps {
  fallbackPath: string;
  className?: string;
}

export function SmartBackButton({ fallbackPath, className }: SmartBackButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [backPath, setBackPath] = useState<string>(fallbackPath);

  useEffect(() => {
    // Check for explicit back path in search params
    const fromParam = searchParams.get("from");
    if (fromParam) {
      setBackPath(decodeURIComponent(fromParam));
      return;
    }

    // Check if we can use browser history
    if (typeof window !== "undefined" && window.history.length > 1) {
      // If referrer is from the same origin and not the login page, use browser back
      const referrer = document.referrer;
      if (referrer && referrer.startsWith(window.location.origin) && !referrer.includes("/login")) {
        // Use browser back for same-origin referrers
        setBackPath("BROWSER_BACK");
        return;
      }
    }

    // Fall back to the provided fallback path
    setBackPath(fallbackPath);
  }, [searchParams, fallbackPath]);

  const handleBack = () => {
    if (backPath === "BROWSER_BACK") {
      router.back();
    } else {
      router.push(backPath);
    }
  };

  // If we're using browser back, render a button with onClick
  if (backPath === "BROWSER_BACK") {
    return (
      <Button variant="ghost" size="icon" onClick={handleBack} className={className}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  // Otherwise, render a Link
  return (
    <Button variant="ghost" size="icon" asChild className={className}>
      <Link href={backPath}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
}