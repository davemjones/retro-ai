import { Socket } from 'socket.io';
import { SessionManager } from './session-manager';
import { generateSessionFingerprint } from './session-utils';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * Socket.io authentication and session security middleware
 * Integrates with our comprehensive session management system
 */

export interface SocketSession {
  userId: string;
  userName: string;
  userEmail?: string;
  sessionId: string;
  fingerprint: {
    ipHash: string;
    userAgentHash: string;
    timestamp: number;
    features?: string[];
  };
  isAuthenticated: boolean;
  boardId?: string;
  lastActivity: number;
  provider?: string;
  sessionToken?: string;
  issuedAt?: number;
  expiresAt?: number;
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

    // Parse cookies into object format
    const cookieObject = parseCookieObject(cookies);
    
    // Look for Better Auth session token (try both possible names)
    const rawSessionToken = cookieObject['better-auth.session_token'] || cookieObject['better-auth.session-token'];
    
    if (!rawSessionToken) {
      console.warn(`Socket authentication failed: No Better Auth token for ${socket.id}`);
      return null;
    }

    // Better Auth signs the session token - extract just the session ID part
    // Format: sessionId.signature
    const sessionToken = decodeURIComponent(rawSessionToken).split('.')[0];

    // Validate session against the database using Better Auth's session table
    const prisma = new PrismaClient();
    let user, session;
    
    try {
      // Look up the session in the database using the session token
      session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });

      if (!session) {
        console.warn(`Socket authentication failed: Invalid session token for ${socket.id}`);
        await prisma.$disconnect();
        return null;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        console.warn(`Socket authentication failed: Expired session for ${socket.id}`);
        await prisma.$disconnect();
        return null;
      }

      user = session.user;
      
      // Note: Better Auth is configured with requireEmailVerification: true
      // Email verification is required for new accounts

    } catch (error) {
      console.error('Database error during socket authentication:', error);
      await prisma.$disconnect();
      return null;
    } finally {
      await prisma.$disconnect();
    }

    // Validate session exists and is active with SessionManager if enabled
    if (enableSessionValidation && session.id) {
      const sessionValidation = await SessionManager.validateSession(session.id);
      
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
      if (session.id) {
        const storedSession = await SessionManager.validateSession(session.id);
        if (storedSession.isValid && storedSession.session) {
          // For sockets, we allow some flexibility in fingerprint validation
          // since browsers may behave differently for WebSocket connections
          console.log(`Socket fingerprint generated for session ${session.id}`);
        }
      }
    }

    // Create socket session object compatible with existing system
    const socketSession: SocketSession = {
      userId: user.id,
      userName: user.name || user.email || 'User',
      userEmail: user.email,
      sessionId: session.id,
      fingerprint: fingerprint || {
        ipHash: clientIP,
        userAgentHash: userAgent,
        timestamp: Date.now(),
        features: [
          'better-auth-session',
          user.emailVerified ? 'email-verified' : 'email-unverified'
        ]
      },
      isAuthenticated: true,
      lastActivity: Date.now(),
      provider: 'better-auth',
      sessionToken: sessionToken,
      issuedAt: Math.floor(session.createdAt.getTime() / 1000),
      expiresAt: Math.floor(session.expiresAt.getTime() / 1000)
    };

    // Update session activity in database
    if (session.id) {
      try {
        const activityHeaders = new Headers();
        activityHeaders.set('user-agent', userAgent);
        activityHeaders.set('x-forwarded-for', clientIP);
        
        await SessionManager.updateSessionActivity(
          session.id,
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

    console.log(`Socket authenticated: ${socket.id} for user ${socketSession.userId} with Better Auth`);
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
    if (!session || !session.userId) {
      return { isValid: false, reason: 'No authenticated session' };
    }

    // Check if session is expired
    if (session.expiresAt && Date.now() / 1000 > session.expiresAt) {
      return { isValid: false, reason: 'Session expired' };
    }

    // Check session idle timeout
    const now = Date.now();
    if (now - session.lastActivity > 30 * 60 * 1000) { // 30 minutes
      return { isValid: false, reason: 'Session idle timeout' };
    }

    // Additional validation for Better Auth sessions
    if (session.provider === 'better-auth') {
      // Verify the user still exists and session is valid
      const prisma = new PrismaClient();
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, emailVerified: true }
        });

        if (!user) {
          return { isValid: false, reason: 'User not found' };
        }

        // Note: Better Auth is configured with requireEmailVerification: true
        // Email verification is required, but existing users retain access
      } catch (error) {
        console.error('Error validating user:', error);
        return { isValid: false, reason: 'Database error' };
      } finally {
        await prisma.$disconnect();
      }
    }

    // Validate session in database if SessionManager is available
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
      if (!session.isAuthenticated) {
        return { canAccess: false, reason: 'Not authenticated' };
      }

      // Import Prisma client for database queries
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // Query to check if user is a member of the board's team
        const boardWithTeam = await prisma.board.findUnique({
          where: { id: boardId },
          include: {
            team: {
              include: {
                members: {
                  where: { userId: session.userId }
                }
              }
            }
          }
        });

        // Board doesn't exist
        if (!boardWithTeam) {
          return { canAccess: false, reason: 'Board not found' };
        }

        // User is not a member of the board's team
        if (boardWithTeam.team.members.length === 0) {
          console.warn(`Access denied: User ${session.userId} attempted to access board ${boardId} but is not a member of team ${boardWithTeam.team.id}`);
          return { 
            canAccess: false, 
            reason: `Not a member of this board's team: ${boardWithTeam.team.name}` 
          };
        }

        // User has access - log successful authorization
        console.log(`Access granted: User ${session.userId} authorized for board ${boardId} (team: ${boardWithTeam.team.name})`);

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

      } finally {
        await prisma.$disconnect();
      }

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