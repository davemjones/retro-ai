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

  // Store active users per board
  const boardUsers = new Map(); // boardId -> Map of userId -> user data
  
  // Helper function to add user to board
  function addUserToBoard(boardId, userData) {
    if (!boardUsers.has(boardId)) {
      boardUsers.set(boardId, new Map());
    }
    boardUsers.get(boardId).set(userData.userId, userData);
  }
  
  // Helper function to remove user from board
  function removeUserFromBoard(boardId, userId) {
    if (boardUsers.has(boardId)) {
      const users = boardUsers.get(boardId);
      users.delete(userId);
      if (users.size === 0) {
        boardUsers.delete(boardId);
      }
    }
  }
  
  // Helper function to get all users in a board
  function getBoardUsers(boardId) {
    if (!boardUsers.has(boardId)) {
      return [];
    }
    return Array.from(boardUsers.get(boardId).values());
  }
  
  // Socket.io connection handling
  io.on('connection', async (socket) => {
    console.log('🔌 User connected:', socket.id);
    
    let session = null;
    let boardAccess = null;
    let currentBoardId = null;
    try {
      // Enhanced authentication with session validation
      const { 
        authenticateSocket, 
        validateSocketSession, 
        createBoardIsolationMiddleware
      } = await import('./lib/socket-auth-secure.mjs');
      
      // Authenticate the socket connection with enhanced security
      session = await authenticateSocket(socket, {
        enableFingerprinting: true,
        enableSessionValidation: true,
        enableRealTimeMonitoring: true,
        sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
        maxIdleTimeMs: 30 * 60 * 1000, // 30 minutes
      });
      
      if (!session) {
        console.warn('🚫 Enhanced authentication failed, disconnecting:', socket.id);
        socket.emit('auth-failed', { reason: 'Authentication required' });
        socket.disconnect();
        return;
      }
      
      console.log('✅ Socket authenticated for user:', session.userName);
      
      // Store session data on socket for later use
      socket.session = session;
      
      // Create board isolation middleware
      boardAccess = createBoardIsolationMiddleware(session);
      
      // IMPORTANT: All socket event handlers must be defined INSIDE this try block
      // so they have access to validateSocketSession and boardAccess functions
      
      // Join board room with enhanced security
    socket.on('join-board', async (boardId) => {
      try {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, session, 'join_board');
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
          console.warn(`🚫 Access denied: User ${session.userId} cannot access board ${boardId}: ${accessValidation.reason}`);
          return;
        }

        // Leave previous board if any
        if (currentBoardId && currentBoardId !== boardId) {
          socket.leave(`board:${currentBoardId}`);
          removeUserFromBoard(currentBoardId, session.userId);
          socket.to(`board:${currentBoardId}`).emit('user-disconnected', {
            userId: session.userId
          });
        }
        
        socket.join(`board:${boardId}`);
        currentBoardId = boardId;
        
        // Add user to board presence tracking
        const userData = {
          userId: session.userId,
          userName: session.userName,
          userEmail: session.userEmail,
          socketId: socket.id,
          timestamp: Date.now()
        };
        addUserToBoard(boardId, userData);
        
        // Notify others in the board
        socket.to(`board:${boardId}`).emit('user-connected', userData);
        
        // Send current room users to the joiner
        const roomUsers = getBoardUsers(boardId);
        socket.emit('room-users', roomUsers);
        
        // Send session confirmation to user
        socket.emit('board-joined', {
          boardId,
          sessionId: session.sessionId,
          timestamp: Date.now()
        });
        
        console.log(`✅ User ${session.userId} (${session.userName}) joined board ${boardId}`);
      } catch (error) {
        console.error('❌ Error in join-board:', error);
        socket.emit('operation-failed', { 
          operation: 'join-board', 
          reason: 'Internal server error' 
        });
      }
    });

    // Leave board room
    socket.on('leave-board', (boardId) => {
      socket.leave(`board:${boardId}`);
      
      // Remove from presence tracking
      if (session) {
        removeUserFromBoard(boardId, session.userId);
        
        // Notify other users in the board
        socket.to(`board:${boardId}`).emit('user-disconnected', {
          userId: session.userId
        });
        
        console.log(`👋 User ${session.userId} (${session.userName}) left board ${boardId}`);
      }
      
      // Clear current board if it matches
      if (currentBoardId === boardId) {
        currentBoardId = null;
      }
    });

    // Handle sticky note movement with authorization
    socket.on('sticky-moved', async (data) => {
      try {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, session, 'sticky_move');
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
          userId: session.userId,
          userName: session.userName,
          sessionId: session.sessionId,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board (including sender)
        io.to(`board:${data.boardId}`).emit('sticky-moved', movementData);
        console.log(`📝 Sticky ${data.stickyId} moved by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in sticky-moved:', error);
        socket.emit('operation-failed', { 
          operation: 'sticky-moved', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle sticky note creation with authorization
    socket.on('sticky-created', async (data) => {
      try {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, session, 'sticky_create');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'sticky-created', 
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

        const createData = {
          ...data,
          userId: session.userId,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board (including sender)
        io.to(`board:${data.boardId}`).emit('sticky-created', createData);
        console.log(`📝 Sticky ${data.stickyId} created by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in sticky-created:', error);
        socket.emit('operation-failed', { 
          operation: 'sticky-created', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle sticky note content/color updates with authorization
    socket.on('sticky-updated', async (data) => {
      try {
        // Validate session for this operation
        const sessionValidation = await validateSocketSession(socket, session, 'sticky_update');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'sticky-updated', 
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

        const updateData = {
          ...data,
          userId: session.userId,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board (including sender)
        io.to(`board:${data.boardId}`).emit('sticky-updated', updateData);
        console.log(`📝 Sticky ${data.stickyId} updated by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in sticky-updated:', error);
        socket.emit('operation-failed', { 
          operation: 'sticky-updated', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle editing start with authorization
    socket.on('editing-start', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'editing_start');
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
          userId: session.userId,
          userName: session.userName,
          sessionId: session.sessionId,
          action: 'start',
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-started', editingData);
        console.log(`✏️ User ${session.userId} started editing sticky ${data.stickyId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in editing-start:', error);
        socket.emit('operation-failed', { 
          operation: 'editing-start', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle editing stop with authorization
    socket.on('editing-stop', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'editing_stop');
        if (!sessionValidation.isValid) {
          // Allow stopping editing even if session is questionable
          console.warn(`Session validation failed but allowing editing stop: ${sessionValidation.reason}`);
        }

        const editingData = {
          stickyId: data.stickyId,
          userId: session.userId,
          userName: session.userName,
          sessionId: session.sessionId,
          action: 'stop',
          timestamp: Date.now()
        };
        
        socket.to(`board:${data.boardId}`).emit('editing-stopped', editingData);
        console.log(`✅ User ${session.userId} stopped editing sticky ${data.stickyId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in editing-stop:', error);
        socket.emit('operation-failed', { 
          operation: 'editing-stop', 
          reason: 'Internal server error' 
        });
      }
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

    // Handle column rename with authorization
    socket.on('column-renamed', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'column_rename');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'column-renamed', 
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

        const renameData = {
          ...data,
          userId: session.userId,
          timestamp: Date.now()
        };
        
        io.to(`board:${data.boardId}`).emit('column-renamed', renameData);
        console.log(`📝 Column ${data.columnId} renamed to "${data.title}" by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in column-renamed:', error);
        socket.emit('operation-failed', { 
          operation: 'column-renamed', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle column deletion with authorization
    socket.on('column-deleted', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'column_delete');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'column-deleted', 
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

        const deleteData = {
          ...data,
          userId: session.userId,
          timestamp: Date.now()
        };
        
        io.to(`board:${data.boardId}`).emit('column-deleted', deleteData);
        console.log(`🗑️ Column ${data.columnId} deleted by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in column-deleted:', error);
        socket.emit('operation-failed', { 
          operation: 'column-deleted', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle sticky note deletion with authorization
    socket.on('sticky-deleted', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'sticky_delete');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'sticky-deleted', 
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

        const deleteData = {
          ...data,
          userId: session.userId,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board
        io.to(`board:${data.boardId}`).emit('sticky-deleted', deleteData);
        console.log(`🗑️ Sticky ${data.stickyId} deleted by ${session.userId} (session: ${session.sessionId})`);
      } catch (error) {
        console.error('❌ Error in sticky-deleted:', error);
        socket.emit('operation-failed', { 
          operation: 'sticky-deleted', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle timer set with authorization
    socket.on('timer-set', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'timer_set');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'timer-set', 
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

        // Validate duration (1 minute to 1 hour)
        const durationMs = data.duration;
        if (!durationMs || durationMs < 60000 || durationMs > 3600000) {
          socket.emit('operation-failed', { 
            operation: 'timer-set', 
            reason: 'Invalid timer duration. Must be between 1 minute and 1 hour.' 
          });
          return;
        }

        const timerData = {
          ...data,
          userId: session.userId,
          userName: session.userName,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board (including sender for consistency)
        io.to(`board:${data.boardId}`).emit('timer-set', timerData);
        console.log(`⏰ Timer set to ${Math.floor(durationMs / 60000)} minutes by ${session.userId} in board ${data.boardId}`);
      } catch (error) {
        console.error('❌ Error in timer-set:', error);
        socket.emit('operation-failed', { 
          operation: 'timer-set', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle timer start with authorization
    socket.on('timer-started', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'timer_start');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'timer-started', 
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

        // Use server timestamp for synchronization
        const serverStartTime = Date.now();
        const timerData = {
          ...data,
          startTime: serverStartTime, // Override with server time
          userId: session.userId,
          userName: session.userName,
          timestamp: serverStartTime
        };
        
        // Broadcast to all users in the board (including sender for sync)
        io.to(`board:${data.boardId}`).emit('timer-started', timerData);
        console.log(`▶️ Timer started by ${session.userId} in board ${data.boardId} at ${serverStartTime}`);
      } catch (error) {
        console.error('❌ Error in timer-started:', error);
        socket.emit('operation-failed', { 
          operation: 'timer-started', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle timer stop with authorization
    socket.on('timer-stopped', async (data) => {
      try {
        const sessionValidation = await validateSocketSession(socket, session, 'timer_stop');
        if (!sessionValidation.isValid) {
          socket.emit('operation-failed', { 
            operation: 'timer-stopped', 
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

        const timerData = {
          ...data,
          userId: session.userId,
          userName: session.userName,
          timestamp: Date.now()
        };
        
        // Broadcast to all users in the board (including sender for consistency)
        io.to(`board:${data.boardId}`).emit('timer-stopped', timerData);
        console.log(`⏹️ Timer stopped by ${session.userId} in board ${data.boardId}`);
      } catch (error) {
        console.error('❌ Error in timer-stopped:', error);
        socket.emit('operation-failed', { 
          operation: 'timer-stopped', 
          reason: 'Internal server error' 
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('🔌 User disconnected:', socket.id);
      
      // Clean up user presence
      if (currentBoardId && session) {
        removeUserFromBoard(currentBoardId, session.userId);
        socket.to(`board:${currentBoardId}`).emit('user-disconnected', {
          userId: session.userId
        });
        console.log(`👋 User ${session.userId} (${session.userName}) disconnected from board ${currentBoardId}`);
      }
    });

    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      console.warn('🚫 Failed to authenticate socket, disconnecting:', socket.id);
      socket.disconnect();
      return;
    }
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