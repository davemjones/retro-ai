import { createAuthClient } from "better-auth/client";

// Create the Better Auth client
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  // Configure client options
  session: {
    cookieName: "better-auth.session-token",
    // Automatically refresh session when it's about to expire
    fetchOptions: {
      onError: (error: any) => {
        if (error.status === 401) {
          // Session expired, redirect to login
          window.location.href = "/";
        }
      },
    },
  },
});

// Export typed auth methods
export const signUp = authClient.signUp;
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = authClient.useSession;

// Email verification methods
export const verifyEmail = authClient.verifyEmail;
export const sendVerificationEmail = authClient.sendVerificationEmail;

// Password reset methods
export const forgotPassword = authClient.forgetPassword;
export const resetPassword = authClient.resetPassword;

// User management
export const updateUser = authClient.updateUser;
export const changePassword = authClient.changePassword;
export const changeEmail = authClient.changeEmail;

// Helper to check if user's email is verified
export async function isEmailVerified(): Promise<boolean> {
  const session = await getSession();
  return session?.data?.user?.emailVerified !== null;
}

// Helper to get current user
export async function getCurrentUser() {
  const session = await getSession();
  return session?.data?.user || null;
}