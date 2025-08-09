"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSession } from "@/lib/auth-client";

interface SessionContextValue {
  data: {
    user: {
      id: string;
      email: string;
      name?: string;
      emailVerified?: boolean;
      createdAt: Date;
      updatedAt: Date;
      image?: string | null;
    };
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
  } | null;
  status: "loading" | "authenticated" | "unauthenticated";
  update: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function BetterAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionContextValue["data"] | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const fetchSession = async () => {
    try {
      const sessionData = await getSession();
      setSession(sessionData?.data || null);
      setStatus(sessionData?.data ? "authenticated" : "unauthenticated");
    } catch (error) {
      console.error("Error fetching session:", error);
      setSession(null);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const update = async () => {
    await fetchSession();
  };

  const value: SessionContextValue = {
    data: session,
    status,
    update,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use session in components
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a BetterAuthProvider");
  }
  return context;
}

// Compatibility layer for components using NextAuth patterns
export function useNextAuthCompatSession() {
  const { data, status } = useSession();
  
  // Transform Better Auth session to NextAuth-like format
  const nextAuthSession = data ? {
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      emailVerified: data.user.emailVerified,
    },
    // Add compatibility fields that existing components might expect
    sessionId: data.session.id,
    expires: data.session.expiresAt.toISOString(),
    // Additional fields for socket compatibility
    requiresFingerprint: true,
    windowSessionId: data.session.id, // Use session ID
    issuedAt: Math.floor(data.session.createdAt.getTime() / 1000),
  } : null;

  return {
    data: nextAuthSession,
    status,
  };
}