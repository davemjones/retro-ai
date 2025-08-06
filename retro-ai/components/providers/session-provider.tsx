"use client";

import { BetterAuthProvider } from "./better-auth-provider";
import { SocketProvider } from "@/lib/socket-context";
import { SecureSessionProvider } from "./secure-session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BetterAuthProvider>
      <SecureSessionProvider>
        <SocketProvider>
          {/* <ActivityTracker /> Temporarily disabled to debug logout issue */}
          {children}
        </SocketProvider>
      </SecureSessionProvider>
    </BetterAuthProvider>
  );
}