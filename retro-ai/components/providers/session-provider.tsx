"use client";

import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "@/lib/socket-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        {/* <ActivityTracker /> Temporarily disabled to debug logout issue */}
        {children}
      </SocketProvider>
    </SessionProvider>
  );
}