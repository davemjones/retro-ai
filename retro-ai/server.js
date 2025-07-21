const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
// Authentication will be loaded dynamically

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    transports: ['websocket', 'polling'],
    cors: {
      origin: process.env.NEXTAUTH_URL || `http://localhost:${port}`,
      methods: ["GET", "POST"]
    }
  });

  // Store server instance globally for API route access
  global.httpServer = httpServer;
  global.io = io;

  // Socket.io connection handling
  io.on('connection', async (socket) => {
    console.log('🔌 User connected:', socket.id);
    
    let session = null;
    try {
      // Dynamic import for ES6 module
      const { authenticateSocket } = await import('./lib/socket-auth-simple.mjs');
      
      // Authenticate the socket connection
      session = await authenticateSocket(socket);
      if (!session) {
        console.warn('🚫 Unauthenticated socket connection, disconnecting:', socket.id);
        socket.disconnect();
        return;
      }
      
      console.log('✅ Socket authenticated for user:', session.userName);
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      console.warn('🚫 Failed to authenticate socket, disconnecting:', socket.id);
      socket.disconnect();
      return;
    }

    // Join board room
    socket.on('join-board', (boardId) => {
      socket.join(`board:${boardId}`);
      console.log(`👥 User ${socket.id} joined board ${boardId}`);
      
      // Notify other users in the board
      socket.to(`board:${boardId}`).emit('user-connected', {
        userId: socket.id,
        userName: session.userName,
        timestamp: Date.now()
      });
    });

    // Leave board room
    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
      console.log(`👋 User ${socket.id} left board ${boardId}`);
      
      // Notify other users in the board
      socket.to(`board:${boardId}`).emit('user-disconnected', {
        userId: socket.id,
        userName: session.userName,
        timestamp: Date.now()
      });
    });

    // Handle sticky note movement
    socket.on('sticky-moved', (data) => {
      console.log(`📝 Sticky ${data.stickyId} moved by ${socket.id}`);
      
      const movementData = {
        ...data,
        userId: socket.id,
        timestamp: Date.now()
      };
      
      // Broadcast to all other users in the board
      socket.to(`board:${data.boardId || 'default'}`).emit('sticky-moved', movementData);
    });

    // Handle editing start
    socket.on('editing-start', (data) => {
      console.log(`✏️ User ${socket.id} started editing sticky ${data.stickyId}`);
      
      const editingData = {
        stickyId: data.stickyId,
        userId: socket.id,
        userName: session.userName,
        action: 'start',
        timestamp: Date.now()
      };
      
      socket.to(`board:${data.boardId || 'default'}`).emit('editing-started', editingData);
    });

    // Handle editing stop
    socket.on('editing-stop', (data) => {
      console.log(`✅ User ${socket.id} stopped editing sticky ${data.stickyId}`);
      
      const editingData = {
        stickyId: data.stickyId,
        userId: socket.id,
        userName: session.userName,
        action: 'stop',
        timestamp: Date.now()
      };
      
      socket.to(`board:${data.boardId || 'default'}`).emit('editing-stopped', editingData);
    });

    // Handle session heartbeat
    socket.on('session-heartbeat', () => {
      console.log(`💓 Heartbeat from user ${socket.id} (${session.userName})`);
      
      // Respond with heartbeat confirmation
      socket.emit('session-heartbeat-response', {
        isValid: true,
        sessionId: socket.id,
        timestamp: Date.now()
      });
    });

    // Handle force session refresh
    socket.on('force-session-refresh', () => {
      console.log(`🔄 Session refresh requested by user ${socket.id} (${session.userName})`);
      
      // Emit session refreshed event
      socket.emit('session-refreshed', {
        sessionId: socket.id,
        timestamp: Date.now()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Ready on http://${hostname}:${port}`);
      console.log(`🔌 Socket.io server running on /api/socket`);
    });
});