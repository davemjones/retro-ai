import { PrismaClient } from '@prisma/client';

/**
 * Simple socket authentication for CommonJS server.js
 * Uses Better Auth session-based authentication without complex session management
 */
async function authenticateSocket(socket) {
  try {
    // Extract cookies from socket headers
    const cookies = socket.handshake.headers.cookie || '';
    
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
    
    try {
      // Look up the session in the database using the session token
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { user: true }
      });

      if (!session) {
        console.warn(`Socket authentication failed: Invalid session token for ${socket.id}`);
        return null;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        console.warn(`Socket authentication failed: Expired session for ${socket.id}`);
        return null;
      }

      // Return simple session object with user information
      return {
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'User',
        isAuthenticated: true,
        lastActivity: Date.now(),
        provider: 'better-auth'
      };

    } catch (error) {
      console.error('Database error during socket authentication:', error);
      return null;
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

export { authenticateSocket };