import { getToken } from 'next-auth/jwt';

/**
 * Simple socket authentication for CommonJS server.js
 * Extracts user information from JWT token without complex session management
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

    // Return simple session object with user information
    return {
      userId: token.id || token.sub,
      userName: token.name || token.email || 'User',
      isAuthenticated: true,
      lastActivity: Date.now(),
    };

  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

export { authenticateSocket };