"use client";

import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/lib/socket-context";
import { SecureSessionProvider } from "./secure-session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SecureSessionProvider>
        <SocketProvider>
          {/* <ActivityTracker /> Temporarily disabled to debug logout issue */}
          {children}
        </SocketProvider>
      </SecureSessionProvider>
    </SessionProvider>
  );
}