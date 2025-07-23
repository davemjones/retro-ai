import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';

/**
 * Secure socket authentication with board authorization for CommonJS server.js
 * Implements team membership validation and comprehensive session management
 */

/**
 * Enhanced authentication for Socket.io connections with team-based board authorization
 */
async function authenticateSocket(socket) {

  try {
    // Extract cookies from socket headers
    const cookies = socket.handshake.headers.cookie || '';
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    const clientIP = getClientIPFromSocket(socket);
    
    // Parse cookies into object format
    const cookieObject = {};
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookieObject[name] = value;
      }
    });

    // Validate JWT token using NextAuth
    const token = await getToken({
      req: {
        headers: { cookie: cookies },
        cookies: cookieObject,
      },
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      console.warn(`Socket authentication failed: No valid token for ${socket.id}`);
      return null;
    }

    // Create socket session object
    const socketSession = {
      userId: token.id || token.sub,
      userName: token.name || token.email || 'User',
      sessionId: token.sessionId || `socket_${Date.now()}`,
      fingerprint: {
        ipHash: clientIP,
        userAgentHash: userAgent,
        timestamp: Date.now(),
      },
      isAuthenticated: true,
      lastActivity: Date.now(),
    };

    console.log(`Socket authenticated: ${socket.id} for user ${socketSession.userId}`);
    return socketSession;

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Validate socket session for specific operations
 */
async function validateSocketSession(socket, session) {
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

    // Update activity timestamp
    session.lastActivity = now;

    return { isValid: true };

  } catch (error) {
    console.error('Socket session validation error:', error);
    return { isValid: false, reason: 'Validation error' };
  }
}

/**
 * Enhanced middleware for board isolation with team membership validation
 */
function createBoardIsolationMiddleware(session) {
  return async (boardId) => {
    try {
      // Validate user has access to this board
      if (!session.isAuthenticated) {
        return { canAccess: false, reason: 'Not authenticated' };
      }

      // Create Prisma client for database queries
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
 * Utility function to get client IP from socket
 */
function getClientIPFromSocket(socket) {
  return (
    socket.handshake.headers['x-forwarded-for'] ||
    socket.handshake.headers['x-real-ip'] ||
    socket.handshake.address ||
    'unknown'
  );
}

export { 
  authenticateSocket, 
  validateSocketSession, 
  createBoardIsolationMiddleware 
};