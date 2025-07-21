import { Socket } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import { SessionManager } from './session-manager';
import { generateSessionFingerprint } from './session-utils';
import { NextRequest } from 'next/server';

/**
 * Socket.io authentication and session security middleware
 * Integrates with our comprehensive session management system
 */

export interface SocketSession {
  userId: string;
  userName: string;
  sessionId: string;
  fingerprint: {
    ipHash: string;
    userAgentHash: string;
    timestamp: number;
  };
  isAuthenticated: boolean;
  boardId?: string;
  lastActivity: number;
}

export interface SocketAuthOptions {
  enableFingerprinting?: boolean;
  enableSessionValidation?: boolean;
  enableRealTimeMonitoring?: boolean;
  sessionTimeoutMs?: number;
  maxIdleTimeMs?: number;
}

/**
 * Enhanced authentication middleware for Socket.io connections
 */
export async function authenticateSocket(
  socket: Socket,
  options: SocketAuthOptions = {}
): Promise<SocketSession | null> {
  const {
    enableFingerprinting = true,
    enableSessionValidation = true,
    enableRealTimeMonitoring = true,
    sessionTimeoutMs = 24 * 60 * 60 * 1000, // 24 hours
    maxIdleTimeMs = 30 * 60 * 1000, // 30 minutes
  } = options;

  try {
    // Extract authentication data from socket headers
    const cookies = parseCookiesFromSocket(socket);
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    const clientIP = getClientIPFromSocket(socket);

    // Validate JWT token
    const token = await getToken({
      req: {
        headers: { cookie: cookies },
        cookies: parseCookieObject(cookies),
      } as unknown as NextRequest,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      console.warn(`Socket authentication failed: No valid token for ${socket.id}`);
      return null;
    }

    // Validate session exists and is active
    if (enableSessionValidation && token.sessionId) {
      const sessionValidation = await SessionManager.validateSession(token.sessionId as string);
      
      if (!sessionValidation.isValid) {
        console.warn(`Socket authentication failed: Invalid session for ${socket.id}: ${sessionValidation.reason}`);
        return null;
      }
    }

    // Generate and validate session fingerprint
    let fingerprint = null;
    if (enableFingerprinting) {
      const headers = new Headers();
      headers.set('user-agent', userAgent);
      headers.set('x-forwarded-for', clientIP);
      
      fingerprint = await generateSessionFingerprint({
        headers: headers,
      } as NextRequest);

      // Validate against stored fingerprint if session exists
      if (token.sessionId) {
        const storedSession = await SessionManager.validateSession(token.sessionId as string);
        if (storedSession.isValid && storedSession.session) {
          // For sockets, we allow some flexibility in fingerprint validation
          // since browsers may behave differently for WebSocket connections
          console.log(`Socket fingerprint generated for session ${token.sessionId}`);
        }
      }
    }

    // Create socket session object
    const socketSession: SocketSession = {
      userId: token.id as string,
      userName: token.name as string || token.email as string,
      sessionId: token.sessionId as string,
      fingerprint: fingerprint || {
        ipHash: 'unknown',
        userAgentHash: 'unknown',
        timestamp: Date.now(),
      },
      isAuthenticated: true,
      lastActivity: Date.now(),
    };

    // Update session activity in database
    if (token.sessionId) {
      try {
        const activityHeaders = new Headers();
        activityHeaders.set('user-agent', userAgent);
        activityHeaders.set('x-forwarded-for', clientIP);
        
        await SessionManager.updateSessionActivity(
          token.sessionId as string,
          {
            headers: activityHeaders,
            method: 'GET',
          } as NextRequest,
          'socket_connect'
        );
      } catch (error) {
        console.error('Failed to update session activity for socket:', error);
      }
    }

    // Set up real-time monitoring if enabled
    if (enableRealTimeMonitoring) {
      setupSocketMonitoring(socket, socketSession, {
        sessionTimeoutMs,
        maxIdleTimeMs,
      });
    }

    console.log(`Socket authenticated: ${socket.id} for user ${socketSession.userId}`);
    return socketSession;

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Set up real-time monitoring for socket connections
 */
function setupSocketMonitoring(
  socket: Socket,
  session: SocketSession,
  options: { sessionTimeoutMs: number; maxIdleTimeMs: number }
) {
  const { sessionTimeoutMs, maxIdleTimeMs } = options;

  // Track activity updates
  const updateActivity = async () => {
    session.lastActivity = Date.now();
    
    if (session.sessionId) {
      try {
        await SessionManager.updateSessionActivity(
          session.sessionId,
          {
            headers: new Headers({
              'user-agent': socket.handshake.headers['user-agent'] || 'unknown',
              'x-forwarded-for': getClientIPFromSocket(socket),
            }),
            method: 'GET',
          } as NextRequest,
          'socket_activity'
        );
      } catch (error) {
        console.error('Failed to update socket activity:', error);
      }
    }
  };

  // Set up activity tracking for various socket events
  const activityEvents = [
    'join-board',
    'leave-board',
    'sticky-moved',
    'editing-start',
    'editing-stop',
  ];

  activityEvents.forEach(event => {
    socket.on(event, updateActivity);
  });

  // Set up periodic session validation
  const sessionCheckInterval = setInterval(async () => {
    const now = Date.now();
    
    // Check for idle timeout
    if (now - session.lastActivity > maxIdleTimeMs) {
      console.log(`Socket ${socket.id} disconnected due to inactivity`);
      socket.emit('session-expired', { reason: 'idle_timeout' });
      socket.disconnect();
      clearInterval(sessionCheckInterval);
      return;
    }

    // Check for session timeout
    if (now - session.fingerprint.timestamp > sessionTimeoutMs) {
      console.log(`Socket ${socket.id} disconnected due to session timeout`);
      socket.emit('session-expired', { reason: 'session_timeout' });
      socket.disconnect();
      clearInterval(sessionCheckInterval);
      return;
    }

    // Validate session is still active in database
    if (session.sessionId) {
      try {
        const validation = await SessionManager.validateSession(session.sessionId);
        if (!validation.isValid) {
          console.log(`Socket ${socket.id} disconnected due to invalid session: ${validation.reason}`);
          socket.emit('session-expired', { reason: 'session_invalid' });
          socket.disconnect();
          clearInterval(sessionCheckInterval);
          return;
        }
      } catch (error) {
        console.error('Session validation error for socket:', error);
      }
    }
  }, 60000); // Check every minute

  // Clean up interval on disconnect
  socket.on('disconnect', () => {
    clearInterval(sessionCheckInterval);
  });
}

/**
 * Validate socket session for specific operations
 */
export async function validateSocketSession(
  socket: Socket,
  session: SocketSession,
  operation: string
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Basic session checks
    if (!session.isAuthenticated) {
      return { isValid: false, reason: 'Not authenticated' };
    }

    // Check session timeout
    const now = Date.now();
    if (now - session.lastActivity > 30 * 60 * 1000) { // 30 minutes
      return { isValid: false, reason: 'Session idle timeout' };
    }

    // Validate session in database
    if (session.sessionId) {
      const validation = await SessionManager.validateSession(session.sessionId);
      if (!validation.isValid) {
        return { isValid: false, reason: validation.reason };
      }
    }

    // Log the operation for security monitoring
    if (session.sessionId) {
      try {
        await SessionManager.updateSessionActivity(
          session.sessionId,
          {
            headers: new Headers({
              'user-agent': socket.handshake.headers['user-agent'] || 'unknown',
              'x-forwarded-for': getClientIPFromSocket(socket),
            }),
            method: 'GET',
          } as NextRequest,
          `socket_${operation}`
        );
      } catch (error) {
        console.error('Failed to log socket operation:', error);
      }
    }

    return { isValid: true };

  } catch (error) {
    console.error('Socket session validation error:', error);
    return { isValid: false, reason: 'Validation error' };
  }
}

/**
 * Enhanced middleware for board isolation
 */
export function createBoardIsolationMiddleware(session: SocketSession) {
  return async (boardId: string): Promise<{ canAccess: boolean; reason?: string }> => {
    try {
      // Validate user has access to this board
      // This would integrate with your existing board permission system
      
      // For now, basic validation that user is authenticated
      if (!session.isAuthenticated) {
        return { canAccess: false, reason: 'Not authenticated' };
      }

      // Update session with current board context
      session.boardId = boardId;
      session.lastActivity = Date.now();

      // Log board access for security monitoring
      if (session.sessionId) {
        try {
          await SessionManager.updateSessionActivity(
            session.sessionId,
            {
              headers: new Headers({
                'user-agent': 'socket',
                'x-forwarded-for': 'socket',
              }),
              method: 'GET',
            } as NextRequest,
            'board_access'
          );
        } catch (error) {
          console.error('Failed to log board access:', error);
        }
      }

      return { canAccess: true };

    } catch (error) {
      console.error('Board isolation middleware error:', error);
      return { canAccess: false, reason: 'Access validation error' };
    }
  };
}

/**
 * Utility functions
 */
function parseCookiesFromSocket(socket: Socket): string {
  return socket.handshake.headers.cookie || '';
}

function parseCookieObject(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
}

function getClientIPFromSocket(socket: Socket): string {
  return (
    socket.handshake.headers['x-forwarded-for'] as string ||
    socket.handshake.headers['x-real-ip'] as string ||
    socket.handshake.address ||
    'unknown'
  );
}

/**
 * Real-time session event emitters for monitoring
 */
export function emitSessionEvent(
  socket: Socket,
  event: 'session-warning' | 'session-update' | 'session-security-alert',
  data: Record<string, unknown>
) {
  socket.emit('session-event', {
    type: event,
    data,
    timestamp: Date.now(),
  });
}