import { PrismaClient } from '@prisma/client';

/**
 * Better Auth compatible socket authentication for CommonJS server.js
 * Maintains team membership validation and comprehensive session management
 */

/**
 * Enhanced authentication for Socket.io connections with Better Auth JWT tokens
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

    // For Better Auth, we need to validate the session token against the database
    // Better Auth uses session-based authentication, not JWT
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
      
      // Note: Better Auth is configured with requireEmailVerification: false
      // so we allow users with unverified emails

    } catch (error) {
      console.error('Database error during socket authentication:', error);
      await prisma.$disconnect();
      return null;
    } finally {
      await prisma.$disconnect();
    }

    const userId = user.id;
    const userEmail = user.email;
    const userName = user.name || userEmail || 'User';
    const sessionId = session.id;

    // Create socket session object compatible with existing system
    const socketSession = {
      userId,
      userName,
      userEmail,
      sessionId,
      fingerprint: {
        ipHash: clientIP,
        userAgentHash: userAgent,
        features: [
          'better-auth-session',
          user.emailVerified ? 'email-verified' : 'email-unverified'
        ]
      },
      securityLevel: 'standard',
      provider: 'better-auth',
      sessionToken: sessionToken,
      issuedAt: Math.floor(session.createdAt.getTime() / 1000),
      expiresAt: Math.floor(session.expiresAt.getTime() / 1000)
    };

    console.log(`Socket authenticated successfully for user ${userId} (${userName}) with Better Auth`);
    return socketSession;

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Validate socket session during operations with Better Auth compatibility
 */
async function validateSocketSession(socket, session, operation) {
  if (!session || !session.userId) {
    return { isValid: false, reason: 'No authenticated session' };
  }

  // Check if session is expired
  if (session.expiresAt && Date.now() / 1000 > session.expiresAt) {
    return { isValid: false, reason: 'Session expired' };
  }

  // Additional validation for Better Auth sessions
  if (session.provider === 'better-auth') {
    // Verify the user still exists and email is verified
    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, emailVerified: true }
      });

      if (!user) {
        return { isValid: false, reason: 'User not found' };
      }

      // Note: Better Auth is configured with requireEmailVerification: false
      // so we allow users with unverified emails for socket operations
    } catch (error) {
      console.error('Error validating user:', error);
      return { isValid: false, reason: 'Database error' };
    } finally {
      await prisma.$disconnect();
    }
  }

  // Log successful validation
  console.log(`✅ Socket session validated for ${operation}: User ${session.userId} (${session.userName})`);
  
  return { isValid: true, session };
}

/**
 * Create board access validation middleware compatible with Better Auth
 */
function createBoardIsolationMiddleware(session) {
  const prisma = new PrismaClient();
  
  return async function validateBoardAccess(boardId) {
    try {
      // Validate board exists and user has access via team membership
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
        return { 
          canAccess: false, 
          reason: 'Board not found' 
        };
      }

      // User is not a member of the board's team
      if (boardWithTeam.team.members.length === 0) {
        return { 
          canAccess: false, 
          reason: 'Not a member of this board\'s team' 
        };
      }

      // Check if user is board owner
      const isOwner = boardWithTeam.createdById === session.userId;
      
      // Get user's role in the team
      const memberRole = boardWithTeam.team.members[0].role;

      console.log(`✅ Board access granted for user ${session.userId} on board ${boardId} (Owner: ${isOwner}, Role: ${memberRole})`);
      
      return { 
        canAccess: true, 
        isOwner,
        role: memberRole,
        board: boardWithTeam,
        reason: 'Access granted' 
      };

    } catch (error) {
      console.error('Board access validation error:', error);
      return { 
        canAccess: false, 
        reason: 'Database error during validation' 
      };
    } finally {
      await prisma.$disconnect();
    }
  };
}

/**
 * Extract client IP from socket connection
 */
function getClientIPFromSocket(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const ip = forwarded 
    ? forwarded.split(',')[0].trim() 
    : socket.handshake.address;
  
  // Handle IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  return ip || 'unknown';
}

// Export functions for use in server.js
export { 
  authenticateSocket, 
  validateSocketSession, 
  createBoardIsolationMiddleware 
};