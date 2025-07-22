/**
 * Secure Session Provider with Window Session Isolation
 * Prevents session sharing between different browser windows/tabs
 */

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWindowSessionSecurity } from '@/hooks/use-window-session-security';

interface SecureSessionProviderProps {
  children: React.ReactNode;
}

export function SecureSessionProvider({ children }: SecureSessionProviderProps) {
  const { data: session, status } = useSession();
  const {
    isWindowSessionValid,
    windowSessionId,
    securityLevel,
    error,
    validateSession,
    getSessionInfo
  } = useWindowSessionSecurity();

  // Log security status for debugging
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const sessionInfo = getSessionInfo();
      console.log('🔒 Session Security Status:', {
        isAuthenticated: true,
        isWindowSessionValid,
        securityLevel,
        sessionInfo
      });
    }
  }, [session, status, isWindowSessionValid, securityLevel, getSessionInfo]);

  // Handle window session validation errors
  useEffect(() => {
    if (error) {
      console.error('🚨 Session security error:', error);
    }
  }, [error]);

  // Periodically validate session (every 30 seconds)
  useEffect(() => {
    if (status !== 'authenticated' || !session) {
      return;
    }

    const interval = setInterval(() => {
      const isValid = validateSession();
      if (!isValid) {
        console.error('🚨 Periodic session validation failed');
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session, status, validateSession]);

  // Show loading state while session security is being initialized
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading secure session...</div>
      </div>
    );
  }

  // Show error state if window session validation failed
  if (status === 'authenticated' && !isWindowSessionValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Session Security Violation
          </h2>
          <p className="text-gray-600 mb-4">
            Your session cannot be validated for security reasons.
          </p>
          <p className="text-sm text-gray-500">
            This may occur when sharing URLs between different browser windows.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}