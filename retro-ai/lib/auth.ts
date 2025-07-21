import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { generateSecureSessionId } from "./cookie-security";
import { SessionManager } from "./session-manager";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60, // 1 hour
      },
    },
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 15 * 60, // 15 minutes
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        
        // Add session metadata for security tracking
        session.sessionId = token.sessionId as string;
        session.issuedAt = token.iat as number;
      }

      return session;
    },
    async jwt({ token, user, trigger }) {
      console.log('JWT callback called with:', { 
        hasUser: !!user, 
        hasToken: !!token, 
        trigger,
        tokenId: token?.id,
        tokenEmail: token?.email,
        tokenSessionId: token?.sessionId
      });
      
      // Handle new login
      if (user) {
        const dbUser = await prisma.user.findFirst({
          where: {
            email: user.email as string,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          
          // Generate unique session ID for tracking
          token.sessionId = generateSecureSessionId();
          
          // Create UserSession record for this login
          try {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
            // Create a mock NextRequest for server-side session creation
            const mockHeaders = new Headers({ 'user-agent': 'NextAuth' });
            const mockRequest = new Request(process.env.NEXTAUTH_URL || 'http://localhost:3000', {
              headers: mockHeaders,
            });
            await SessionManager.createSession(
              dbUser.id,
              token.sessionId as string,
              mockRequest as NextRequest,
              expiresAt
            );
            console.log(`UserSession record created for user ${dbUser.id} with session ID ${token.sessionId}`);
          } catch (error) {
            console.error('Failed to create UserSession record:', error);
            // Don't fail the login if UserSession creation fails
            console.error('Error details:', error);
          }
          
          console.log(`New session created for user ${dbUser.id} with session ID ${token.sessionId}`);
        }
        return token;
      }

      // Handle existing session
      console.log('Handling existing session for email:', token.email);
      
      const dbUser = await prisma.user.findFirst({
        where: {
          email: token.email as string,
        },
      });

      if (!dbUser) {
        console.log('No database user found for email:', token.email);
        return token;
      }

      console.log('Database user found, returning token with preserved sessionId');
      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        sessionId: token.sessionId, // Preserve session ID
      };
    },
  },
};