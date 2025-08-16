import { PrismaClient } from '@prisma/client';

/**
 * Secure socket authentication with board authorization for CommonJS server.js
 * Uses Better Auth session-based authentication with team membership validation
 */

/**
 * Enhanced authentication for Socket.io connections with Better Auth sessions
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

    // Create socket session object compatible with existing system
    const socketSession = {
      userId: user.id,
      userName: user.name || user.email || 'User',
      userEmail: user.email,
      sessionId: session.id,
      fingerprint: {
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

    console.log(`Socket authenticated: ${socket.id} for user ${socketSession.userId} with Better Auth`);
    return socketSession;

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Validate socket session for specific operations with Better Auth compatibility
 */
async function validateSocketSession(socket, session, operation) {
  if (!session || !session.userId) {
    return { isValid: false, reason: 'No authenticated session' };
  }

  try {
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

    // Update activity timestamp
    session.lastActivity = now;

    // Log successful validation
    console.log(`✅ Socket session validated for ${operation || 'operation'}: User ${session.userId} (${session.userName})`);

    return { isValid: true, session };

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