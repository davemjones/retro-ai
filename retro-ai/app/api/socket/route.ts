import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Global variable to store the Socket.io server instance
let io: SocketIOServer | undefined;

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.io server
    const httpServer = (global as any).httpServer;
    
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

    // Set up Socket.io event handlers
    io.on('connection', async (socket) => {
      console.log('User connected:', socket.id);

      // Authentication middleware for socket
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        socket.disconnect();
        return;
      }

      const userId = session.user.id;
      const userName = session.user.name || session.user.email;

      // Join board room
      socket.on('join-board', (boardId: string) => {
        socket.join(`board:${boardId}`);
        socket.to(`board:${boardId}`).emit('user-connected', {
          userId,
          userName,
          timestamp: Date.now()
        });
        console.log(`User ${userId} joined board ${boardId}`);
      });

      // Leave board room
      socket.on('leave-board', (boardId: string) => {
        socket.leave(`board:${boardId}`);
        socket.to(`board:${boardId}`).emit('user-disconnected', {
          userId,
          userName,
          timestamp: Date.now()
        });
        console.log(`User ${userId} left board ${boardId}`);
      });

      // Handle sticky note movement
      socket.on('sticky-moved', (data: {
        stickyId: string;
        columnId: string | null;
        positionX?: number;
        positionY?: number;
        boardId: string;
      }) => {
        const movementData = {
          ...data,
          userId,
          timestamp: Date.now()
        };
        
        // Broadcast to all other users in the board
        socket.to(`board:${data.boardId}`).emit('sticky-moved', movementData);
        console.log(`Sticky ${data.stickyId} moved by ${userId}`);
      });

      // Handle editing start
      socket.on('editing-start', (data: { stickyId: string; boardId: string }) => {
        const editingData = {
          stickyId: data.stickyId,
          userId,
          userName,
          action: 'start' as const,
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-started', editingData);
        console.log(`User ${userId} started editing sticky ${data.stickyId}`);
      });

      // Handle editing stop
      socket.on('editing-stop', (data: { stickyId: string; boardId: string }) => {
        const editingData = {
          stickyId: data.stickyId,
          userId,
          userName,
          action: 'stop' as const,
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-stopped', editingData);
        console.log(`User ${userId} stopped editing sticky ${data.stickyId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });

    // Store the server instance globally
    (global as any).io = io;
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
  return GET({} as NextRequest);
}