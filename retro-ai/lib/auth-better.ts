import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { generateSecureSessionId } from "./cookie-security";
import { SessionManager } from "./session-manager";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  session: {
    cookieName: "better-auth.session_token",
    expiresIn: 60 * 60 * 24, // 24 hours in seconds
    updateAge: 60 * 60 * 12, // Update session every 12 hours
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax", // Changed from strict to lax for better compatibility
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
    },
  },
  account: {
    // Ensure accounts are created with proper user association
    accountLinking: {
      enabled: true,
      trustedProviders: ["email"], // Only allow email provider for now
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Temporarily disable for testing
    password: {
      hash: async (password) => {
        const salt = bcrypt.genSaltSync(10);
        return bcrypt.hashSync(password, salt);
      },
      verify: async ({ hash, password }) => {
        return bcrypt.compareSync(password, hash);
      }
    },
    sendResetPassword: async ({ user, token, url }: { user: any, token: string, url: string }) => {
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail(user.email, url, token);
    },
    sendVerificationEmail: async ({ user, token, url }: { user: any, token: string, url: string }) => {
      const { sendVerificationEmail } = await import("./email");
      await sendVerificationEmail(user.email, url, token);
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url, token }: { user: any, newEmail: string, url: string, token: string }) => {
        const { sendChangeEmailVerification } = await import("./email");
        await sendChangeEmailVerification(newEmail, url, token);
      },
    },
  },
  // Simplified configuration to avoid conflicts
  // advanced: {
  //   // Custom JWT configuration for socket server compatibility
  //   database: {
  //     generateId: () => generateSecureSessionId(),
  //   },
  //   // Ensure JWT includes necessary fields for socket authentication
  //   cookiePrefix: "better-auth",
  //   defaultCookieAttributes: {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === "production",
  //     sameSite: "strict",
  //   },
  // },
  // Simplified callbacks - let Better Auth handle most of the work
  // callbacks: {
  //   session: {
  //     // Add custom session data for socket server compatibility
  //     create: async ({ session, user, request }: { session: any, user: any, request: any }) => {
  //       // Generate session IDs for tracking and window validation
  //       const sessionId = generateSecureSessionId();
  //       const windowSessionId = generateSecureSessionId();
        
  //       // Create UserSession record for tracking
  //       if (request) {
  //         const nextRequest = request as NextRequest;
  //         const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          
  //         try {
  //           await SessionManager.createSession(
  //             user.id,
  //             sessionId,
  //             nextRequest,
  //             expiresAt
  //           );
  //         } catch (error) {
  //           console.error("Failed to create UserSession record:", error);
  //         }
  //       }
        
  //       return {
  //         ...session,
  //         sessionId,
  //         windowSessionId,
  //         requiresFingerprint: true,
  //       };
  //     },
  //     // Update session with user data
  //     update: async ({ session }: { session: any }) => {
  //       return session;
  //     },
  //   },
  // },
  // Rate limiting configuration
  rateLimit: {
    // Window is in seconds for Better Auth
    window: 60, // 1 minute
    max: 10, // Max 10 requests per minute
    // Custom rate limit for sensitive endpoints
    custom: {
      "/api/auth/forgot-password": {
        window: 300, // 5 minutes
        max: 3, // Max 3 password reset requests per 5 minutes
      },
      "/api/auth/verify-email": {
        window: 60, // 1 minute
        max: 5, // Max 5 verification attempts per minute
      },
    },
  },
});

// Type exports for use throughout the application
export type Session = typeof auth.$Infer.Session;