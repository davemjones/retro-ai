/**
 * React hook for window-specific session security
 * Prevents session sharing between different browser windows/tabs
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { 
  getWindowSessionId, 
  validateWindowSession, 
  clearWindowSessionId,
  getSessionSecurityLevel 
} from '@/lib/window-session-security';

interface WindowSessionSecurityState {
  isWindowSessionValid: boolean;
  windowSessionId: string | null;
  securityLevel: 'high' | 'medium' | 'low';
  isLoading: boolean;
  error: string | null;
}

export function useWindowSessionSecurity() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<WindowSessionSecurityState>({
    isWindowSessionValid: true,
    windowSessionId: null,
    securityLevel: 'low',
    isLoading: true,
    error: null
  });

  // Initialize window session security
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const windowSessionId = getWindowSessionId();
      const securityLevel = getSessionSecurityLevel();
      
      setState(prev => ({
        ...prev,
        windowSessionId,
        securityLevel,
        isLoading: false
      }));
      
      console.log('🔒 Window session security initialized:', {
        windowSessionId,
        securityLevel
      });
    } catch (error) {
      console.error('❌ Failed to initialize window session security:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize window session security',
        isLoading: false
      }));
    }
  }, []);

  // Handle session security violations
  const handleSessionViolation = useCallback(async (reason: string) => {
    console.error('🚨 Session security violation:', reason);
    
    setState(prev => ({
      ...prev,
      isWindowSessionValid: false,
      error: reason
    }));

    // Clear window session and sign out
    clearWindowSessionId();
    
    try {
      await signOut({
        callbackUrl: '/login?error=SessionSecurityViolation',
        redirect: true
      });
    } catch (error) {
      console.error('❌ Failed to sign out after security violation:', error);
      // Force redirect as fallback
      window.location.href = '/login?error=SessionSecurityViolation';
    }
  }, []);

  // Bind and validate window session when session changes
  useEffect(() => {
    if (status === 'loading' || !session || !state.windowSessionId) {
      return;
    }

    const sessionWindowId = (session as any).windowSessionId;
    
    if (sessionWindowId) {
      // Check if this window session is already bound to this session
      const BOUND_SESSION_KEY = `retro-ai-bound-session-${sessionWindowId}`;
      const boundWindowSessionId = sessionStorage.getItem(BOUND_SESSION_KEY);
      
      if (boundWindowSessionId === null) {
        // First time this session is accessed - bind current window session ID
        sessionStorage.setItem(BOUND_SESSION_KEY, state.windowSessionId);
        console.log('🔒 Window session bound to server session:', {
          serverSessionId: sessionWindowId,
          windowSessionId: state.windowSessionId
        });
        
        setState(prev => ({
          ...prev,
          isWindowSessionValid: true
        }));
      } else if (boundWindowSessionId === state.windowSessionId) {
        // Window session matches - valid access
        console.log('✅ Window session validation passed');
        setState(prev => ({
          ...prev,
          isWindowSessionValid: true
        }));
      } else {
        // Window session mismatch - someone is trying to use this session from a different window
        console.error('🚨 SECURITY VIOLATION: Session accessed from different window', {
          expectedWindowSessionId: boundWindowSessionId,
          currentWindowSessionId: state.windowSessionId,
          serverSessionId: sessionWindowId
        });
        
        handleSessionViolation('Session accessed from unauthorized window');
        return;
      }
    } else {
      // No window session requirement in session - allow for backward compatibility
      setState(prev => ({
        ...prev,
        isWindowSessionValid: true
      }));
    }
  }, [session, status, state.windowSessionId, handleSessionViolation]);

  // Force session validation
  const validateSession = useCallback(() => {
    if (!session || !state.windowSessionId) {
      return true;
    }

    const sessionWindowId = (session as any).windowSessionId;
    
    if (sessionWindowId) {
      const isValid = validateWindowSession(sessionWindowId);
      
      if (!isValid) {
        handleSessionViolation('Manual session validation failed');
        return false;
      }
    }

    return true;
  }, [session, state.windowSessionId, handleSessionViolation]);

  // Get current window session info for debugging
  const getSessionInfo = useCallback(() => {
    return {
      windowSessionId: state.windowSessionId,
      sessionWindowId: session ? (session as any).windowSessionId : null,
      securityLevel: state.securityLevel,
      isValid: state.isWindowSessionValid,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      timestamp: new Date().toISOString()
    };
  }, [session, state]);

  return {
    isWindowSessionValid: state.isWindowSessionValid,
    windowSessionId: state.windowSessionId,
    securityLevel: state.securityLevel,
    isLoading: state.isLoading,
    error: state.error,
    validateSession,
    getSessionInfo,
    handleSessionViolation
  };
}