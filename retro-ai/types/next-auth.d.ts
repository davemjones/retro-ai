import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    sessionId?: string;
    issuedAt?: number;
    requiresFingerprint?: boolean; // SECURITY: Session fingerprinting requirement
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    sessionId?: string;
    requiresFingerprint?: boolean; // SECURITY: Fingerprinting flag
    fingerprint?: { // SECURITY: Stored session fingerprint
      ipHash: string;
      userAgentHash: string;
      timestamp: number;
    };
  }
}