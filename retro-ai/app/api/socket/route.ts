import { Server as SocketIOServer, Socket } from 'socket.io';
import { NextRequest } from 'next/server';
import { 
  authenticateSocket, 
  validateSocketSession, 
  createBoardIsolationMiddleware
} from '@/lib/socket-auth';
import { SessionManager } from '@/lib/session-manager';

// Utility function to get client IP from socket
function getClientIPFromSocket(socket: Socket): string {
  return (
    socket.handshake.headers['x-forwarded-for'] as string ||
    socket.handshake.headers['x-real-ip'] as string ||
    socket.handshake.address ||
    'unknown'
  );
}

// Global variable to store the Socket.io server instance
let io: SocketIOServer | undefined;

export async function GET() {
  if (!io) {
    // Initialize Socket.io server
    const httpServer = (global as Record<string, unknown>).httpServer;
    
    if (!httpServer) {
      // For development, we'll create a basic server setup indicator
      return new Response(JSON.stringify({ 
        message: "Socket.io server initialization required",
        status: "pending"
      }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Set up Socket.io event handlers with enhanced authentication
    io.on('connection', async (socket) => {
      console.log('Socket connection attempt:', socket.id);

      // Enhanced authentication with session validation
      const socketSession = await authenticateSocket(socket, {
        enableFingerprinting: true,
        enableSessionValidation: true,
        enableRealTimeMonitoring: true,
        sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
        maxIdleTimeMs: 30 * 60 * 1000, // 30 minutes
      });

      if (!socketSession) {
        console.warn(`Socket authentication failed for ${socket.id}`);
        socket.emit('auth-failed', { reason: 'Authentication required' });
        socket.disconnect();
        return;
      }

      console.log(`Socket authenticated: ${socket.id} for user ${socketSession.userId}`);
      
      // Store session data on socket for later use
      (socket as Socket & { session: typeof socketSession }).session = socketSession;
      
      // Create board isolation middleware
      const boardAccess = createBoardIsolationMiddleware(socketSession);

      // Join board room with enhanced security
      socket.on('join-board', async (boardId: string) => {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, socketSession, 'join_board');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'join-board', 
            reason: sessionValidation.reason 
          });
          return;
        }

        // Validate board access
        const accessValidation = await boardAccess(boardId);
        if (!accessValidation.canAccess) {
          socket.emit('access-denied', { 
            resource: 'board', 
            boardId, 
            reason: accessValidation.reason 
          });
          return;
        }

        socket.join(`board:${boardId}`);
        socket.to(`board:${boardId}`).emit('user-connected', {
          userId: socketSession.userId,
          userName: socketSession.userName,
          sessionId: socketSession.sessionId,
          timestamp: Date.now()
        });
        
        // Send session confirmation to user
        socket.emit('board-joined', {
          boardId,
          sessionId: socketSession.sessionId,
          timestamp: Date.now()
        });
        
        console.log(`User ${socketSession.userId} joined board ${boardId} (session: ${socketSession.sessionId})`);
      });

      // Leave board room with session tracking
      socket.on('leave-board', async (boardId: string) => {
        const sessionValidation = await validateSocketSession(socket, socketSession, 'leave_board');
        if (!sessionValidation.isValid) {
          // Still allow leaving even if session is invalid
          console.warn(`Session invalid but allowing board leave: ${sessionValidation.reason}`);
        }

        socket.leave(`board:${boardId}`);
        socket.to(`board:${boardId}`).emit('user-disconnected', {
          userId: socketSession.userId,
          userName: socketSession.userName,
          sessionId: socketSession.sessionId,
          timestamp: Date.now()
        });
        
        console.log(`User ${socketSession.userId} left board ${boardId} (session: ${socketSession.sessionId})`);
      });

      // Handle sticky note movement with session validation
      socket.on('sticky-moved', async (data: {
        stickyId: string;
        columnId: string | null;
        positionX?: number;
        positionY?: number;
        boardId: string;
      }) => {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, socketSession, 'sticky_move');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'sticky-moved', 
            reason: sessionValidation.reason 
          });
          return;
        }

        // Validate board access
        const accessValidation = await boardAccess(data.boardId);
        if (!accessValidation.canAccess) {
          socket.emit('access-denied', { 
            resource: 'board', 
            boardId: data.boardId, 
            reason: accessValidation.reason 
          });
          return;
        }

        const movementData = {
          ...data,
          userId: socketSession.userId,
          sessionId: socketSession.sessionId,
          timestamp: Date.now()
        };
        
        // Broadcast to all other users in the board
        socket.to(`board:${data.boardId}`).emit('sticky-moved', movementData);
        console.log(`Sticky ${data.stickyId} moved by ${socketSession.userId} (session: ${socketSession.sessionId})`);
      });

      // Handle editing start with session validation
      socket.on('editing-start', async (data: { stickyId: string; boardId: string }) => {
        const sessionValidation = await validateSocketSession(socket, socketSession, 'editing_start');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'editing-start', 
            reason: sessionValidation.reason 
          });
          return;
        }

        const accessValidation = await boardAccess(data.boardId);
        if (!accessValidation.canAccess) {
          socket.emit('access-denied', { 
            resource: 'board', 
            boardId: data.boardId, 
            reason: accessValidation.reason 
          });
          return;
        }

        const editingData = {
          stickyId: data.stickyId,
          userId: socketSession.userId,
          userName: socketSession.userName,
          sessionId: socketSession.sessionId,
          action: 'start' as const,
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-started', editingData);
        console.log(`User ${socketSession.userId} started editing sticky ${data.stickyId} (session: ${socketSession.sessionId})`);
      });

      // Handle editing stop with session validation
      socket.on('editing-stop', async (data: { stickyId: string; boardId: string }) => {
        const sessionValidation = await validateSocketSession(socket, socketSession, 'editing_stop');
        if (!sessionValidation.isValid) {
          // Allow stopping editing even if session is questionable
          console.warn(`Session validation failed but allowing editing stop: ${sessionValidation.reason}`);
        }

        const editingData = {
          stickyId: data.stickyId,
          userId: socketSession.userId,
          userName: socketSession.userName,
          sessionId: socketSession.sessionId,
          action: 'stop' as const,
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-stopped', editingData);
        console.log(`User ${socketSession.userId} stopped editing sticky ${data.stickyId} (session: ${socketSession.sessionId})`);
      });

      // Enhanced real-time session monitoring events
      socket.on('session-heartbeat', async () => {
        const sessionValidation = await validateSocketSession(socket, socketSession, 'heartbeat');
        socket.emit('session-heartbeat-response', {
          isValid: sessionValidation.isValid,
          sessionId: socketSession.sessionId,
          timestamp: Date.now()
        });
      });

      // Handle session force refresh from admin/security system
      socket.on('force-session-refresh', async () => {
        console.log(`Force session refresh requested for ${socketSession.sessionId}`);
        
        // Re-authenticate the socket
        const newSocketSession = await authenticateSocket(socket, {
          enableFingerprinting: true,
          enableSessionValidation: true,
          enableRealTimeMonitoring: true,
        });

        if (!newSocketSession) {
          socket.emit('session-refresh-failed', { reason: 'Authentication failed' });
          socket.disconnect();
          return;
        }

        // Update socket session
        (socket as Socket & { session: typeof newSocketSession }).session = newSocketSession;
        socket.emit('session-refreshed', {
          sessionId: newSocketSession.sessionId,
          timestamp: Date.now()
        });
      });

      // Handle disconnect with session cleanup
      socket.on('disconnect', async (reason) => {
        console.log(`Socket disconnected: ${socket.id} (${reason}) - User: ${socketSession.userId}, Session: ${socketSession.sessionId}`);
        
        // Update session activity to track disconnection
        if (socketSession.sessionId) {
          try {
            await SessionManager.updateSessionActivity(
              socketSession.sessionId,
              {
                headers: new Headers({
                  'user-agent': socket.handshake.headers['user-agent'] || 'unknown',
                  'x-forwarded-for': getClientIPFromSocket(socket),
                }),
                method: 'GET',
              } as NextRequest,
              'socket_disconnect'
            );
          } catch (error) {
            console.error('Failed to log socket disconnect:', error);
          }
        }
      });
    });

    // Store the server instance globally
    (global as Record<string, unknown>).io = io;
  }

  return new Response(JSON.stringify({ 
    message: "Socket.io server running",
    status: "active"
  }), { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST() {
  // Handle POST requests if needed
  return GET();
}