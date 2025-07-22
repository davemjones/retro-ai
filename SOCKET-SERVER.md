# Socket Server Documentation for Retro AI

## ⚠️ CRITICAL: Read Before Any Socket/Real-time Work

**MANDATORY**: Consult this document every time you work on real-time communication, WebSocket, or Socket.io code.

## Architecture Overview

The Retro AI application uses a **standalone Node.js server** (`server.js`) with Socket.io for real-time communication, NOT Next.js API routes for WebSocket handling.

### Current Server Configuration (server.js)

**Server Setup:**
- Next.js custom server with HTTP server
- Socket.io server mounted at `/api/socket`
- CORS configured for Next.js origin
- Global server instances: `global.httpServer`, `global.io`

**Socket.io Configuration:**
```javascript
const io = new Server(httpServer, {
  path: '/api/socket',
  addTrailingSlash: false,
  transports: ['websocket', 'polling'],
  cors: {
    origin: process.env.NEXTAUTH_URL || `http://localhost:${port}`,
    methods: ["GET", "POST"]
  }
});
```

**Authentication Flow:**
1. Import `socket-auth-secure.mjs` dynamically (NEVER `.ts` files)
2. Call `authenticateSocket()` with enhanced options
3. Create `boardAccess` middleware with `createBoardIsolationMiddleware()`
4. Store session data on socket: `socket.session = session`

### Key Components

1. **`server.js`** - Main server with Express-like HTTP server + Socket.io
2. **`lib/socket-auth-secure.mjs`** - Secure authentication with board authorization
3. **`lib/socket-auth-simple.mjs`** - Simple authentication fallback
4. **`lib/socket-context.tsx`** - Client-side Socket.io context
5. **`app/api/socket/route.ts`** - DISABLED Next.js API route (for reference only)

## 🚨 CRITICAL RULES

### 1. Module Import Rules
- **NEVER import TypeScript files in `server.js`**
- Node.js server **CANNOT** import `.ts` files directly
- **ALWAYS use `.mjs` or `.js` files for server-side Socket.io code**
- ❌ `await import('./lib/socket-auth.ts')` - WILL FAIL
- ✅ `await import('./lib/socket-auth-secure.mjs')` - CORRECT

### 2. Scope Management Rules ⚠️ CRITICAL
- **ALL socket event handlers MUST be inside the authentication try block**
- Authentication imports (`validateSocketSession`, `boardAccess`) are only available inside the try block
- ❌ Defining socket handlers outside try block - WILL CAUSE "ReferenceError: validateSocketSession is not defined"
- ✅ All `socket.on()` calls must be inside the authentication try block
- **ALWAYS end the try block AFTER all socket event handlers**

### 3. Security Requirements
- **ALWAYS validate team membership** before allowing board access
- **NEVER allow cross-team data exposure**
- **ALWAYS use** `createBoardIsolationMiddleware` for board operations
- **ALWAYS validate sessions** for all board operations

### 4. Error Handling Requirements
- **ALWAYS emit** proper error events: `access-denied`, `operation-failed`, `auth-failed`
- **ALWAYS include** meaningful error messages and reasons
- **ALWAYS log** security violations for monitoring

### 5. WebSocket Broadcasting Rules ⚠️ CRITICAL
- **Use `io.to()` for content updates** where users need to see their own changes reflected
- **Use `socket.to()` for notifications** where users don't need to see their own actions
- **Content updates**: `sticky-updated`, `sticky-moved`, `column-renamed`, `column-deleted` → Use `io.to()`
- **Notifications**: `user-connected`, `user-disconnected`, `editing-started`, `editing-stopped` → Use `socket.to()`

## File Structure and Responsibilities

### `server.js` - Main Socket Server
```javascript
// CORRECT structure for Socket.io server
const { Server } = require('socket.io');
const io = new Server(httpServer, {
  path: '/api/socket',
  // ... config
});

io.on('connection', async (socket) => {
  let session = null;
  let boardAccess = null;
  
  try {
    // CORRECT authentication import inside try block
    const { 
      authenticateSocket, 
      validateSocketSession, 
      createBoardIsolationMiddleware
    } = await import('./lib/socket-auth-secure.mjs'); // .mjs NOT .ts!
    
    // Authenticate socket
    session = await authenticateSocket(socket, options);
    if (!session) {
      socket.emit('auth-failed', { reason: 'Authentication required' });
      socket.disconnect();
      return;
    }
    
    // Create board access middleware
    boardAccess = createBoardIsolationMiddleware(session);
    
    // CRITICAL: ALL socket event handlers must be defined INSIDE this try block
    socket.on('join-board', async (boardId) => {
      // validateSocketSession and boardAccess are available here
      const sessionValidation = await validateSocketSession(socket, session, 'join_board');
      // ... rest of handler
    });
    
    socket.on('sticky-moved', async (data) => {
      // validateSocketSession and boardAccess are available here
      const sessionValidation = await validateSocketSession(socket, session, 'sticky_move');
      // ... rest of handler
    });
    
    // ... all other socket handlers ...
    
  } catch (error) {
    console.error('❌ Socket authentication error:', error);
    socket.disconnect();
    return;
  }
});
```

## Current Socket Events Implementation (Updated 2025-07-22)

### Complete List of Implemented Socket Events

**Connection Management:**
- `connection` - Initial socket connection with authentication
- `join-board` - Join a specific board room with board access validation
- `leave-board` - Leave a board room 
- `disconnect` - Handle socket disconnection

**Sticky Note Operations:**
- `sticky-moved` - Handle sticky note movement between columns/unassigned
- `sticky-updated` - Handle sticky note content/color updates (collaborative editing)
- `sticky-created` - Handle sticky note creation with real-time broadcasting
- `sticky-deleted` - Handle sticky note deletion with real-time updates

**Editing Indicators:**
- `editing-start` - Show when user starts editing a sticky note
- `editing-stop` - Hide editing indicator when user stops editing

**Column Operations (Board Owner Only):**
- `column-renamed` - Handle column title changes
- `column-deleted` - Handle column deletion (with sticky migration)

**Session Management:**
- `session-heartbeat` - Keep-alive mechanism  
- `force-session-refresh` - Manual session refresh

**Client Events (Emitted TO clients):**
- `user-connected` - Notify when user joins board
- `user-disconnected` - Notify when user leaves board  
- `sticky-moved` - Broadcast sticky movement
- `sticky-updated` - Broadcast sticky content/color changes
- `sticky-created` - Broadcast sticky note creation
- `sticky-deleted` - Broadcast sticky note deletion
- `editing-started` - Show editing indicator
- `editing-stopped` - Hide editing indicator
- `column-renamed` - Broadcast column title changes
- `column-deleted` - Broadcast column deletion
- `board-joined` - Confirm board join success
- `session-heartbeat-response` - Heartbeat acknowledgment
- `session-refreshed` - Session refresh confirmation
- `auth-failed` - Authentication failure
- `operation-failed` - Operation validation failure
- `access-denied` - Board/resource access denied

### Session Management Implementation

**Enhanced Authentication Options:**
```javascript
session = await authenticateSocket(socket, {
  enableFingerprinting: true,
  enableSessionValidation: true, 
  enableRealTimeMonitoring: true,
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  maxIdleTimeMs: 30 * 60 * 1000, // 30 minutes
});
```

**Session Heartbeat System:**
- Client sends `session-heartbeat` events
- Server responds with `session-heartbeat-response`
- Used for session validation and keep-alive
- Helps track active connections and session health

### Required Socket Events with Authorization

#### 1. Connection and Authentication
```javascript
io.on('connection', async (socket) => {
  // 1. Authenticate socket
  const session = await authenticateSocket(socket, options);
  if (!session) {
    socket.emit('auth-failed', { reason: 'Authentication required' });
    socket.disconnect();
    return;
  }
  
  // 2. Create board isolation middleware
  const boardAccess = createBoardIsolationMiddleware(session);
  
  // 3. Store session on socket
  socket.session = session;
});
```

#### 2. Board Join (CRITICAL SECURITY)
```javascript
socket.on('join-board', async (boardId) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'join_board');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { 
        operation: 'join-board', 
        reason: sessionValidation.reason 
      });
      return;
    }

    // 2. CRITICAL: Validate board access (team membership)
    const accessValidation = await boardAccess(boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { 
        resource: 'board', 
        boardId, 
        reason: accessValidation.reason 
      });
      console.warn(`🚫 Access denied: User ${session.userId} cannot access board ${boardId}`);
      return;
    }

    // 3. Join room and notify
    socket.join(`board:${boardId}`);
    socket.emit('board-joined', { boardId, sessionId: session.sessionId });
    // ... rest of logic
  } catch (error) {
    console.error('❌ Error in join-board:', error);
    socket.emit('operation-failed', { operation: 'join-board', reason: 'Internal server error' });
  }
});
```

#### 3. Sticky Note Creation (sticky-created)
```javascript
socket.on('sticky-created', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'sticky_create');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'sticky-created', reason: sessionValidation.reason });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. Process sticky creation
    const createData = {
      ...data,
      userId: session.userId,
      timestamp: Date.now()
    };
    
    // 4. CRITICAL: Use io.to() so creator sees their own sticky immediately
    io.to(`board:${data.boardId}`).emit('sticky-created', createData);
  } catch (error) {
    console.error('❌ Error in sticky-created:', error);
    socket.emit('operation-failed', { operation: 'sticky-created', reason: 'Internal server error' });
  }
});
```

#### 4. Sticky Note Content Updates (sticky-updated)
```javascript
socket.on('sticky-updated', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'sticky_update');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'sticky-updated', reason: sessionValidation.reason });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. Process content update
    const updateData = {
      ...data,
      userId: session.userId,
      timestamp: Date.now()
    };
    
    // 4. CRITICAL: Use io.to() so sender sees their own updates
    io.to(`board:${data.boardId}`).emit('sticky-updated', updateData);
  } catch (error) {
    console.error('❌ Error in sticky-updated:', error);
    socket.emit('operation-failed', { operation: 'sticky-updated', reason: 'Internal server error' });
  }
});
```

#### 4. Board Operations (sticky-moved, editing-start, etc.)
```javascript
socket.on('sticky-moved', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'sticky_move');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'sticky-moved', reason: sessionValidation.reason });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. Process operation
    const movementData = {
      ...data,
      userId: session.userId,
      sessionId: session.sessionId,
      timestamp: Date.now()
    };
    io.to(`board:${data.boardId}`).emit('sticky-moved', movementData);
  } catch (error) {
    console.error('❌ Error in sticky-moved:', error);
    socket.emit('operation-failed', { operation: 'sticky-moved', reason: 'Internal server error' });
  }
});
```

#### 4. Column Management Operations (Board Owner Only)
```javascript
socket.on('column-renamed', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'column_rename');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'column-renamed', reason: sessionValidation.reason });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. CRITICAL: Validate board ownership (column operations require ownership)
    if (!accessValidation.isOwner) {
      socket.emit('access-denied', { 
        resource: 'column', 
        boardId: data.boardId, 
        reason: 'Column operations require board ownership' 
      });
      return;
    }

    // 4. Process column rename
    const renameData = {
      ...data,
      userId: session.userId,
      timestamp: Date.now()
    };
    io.to(`board:${data.boardId}`).emit('column-renamed', renameData);
  } catch (error) {
    console.error('❌ Error in column-renamed:', error);
    socket.emit('operation-failed', { operation: 'column-renamed', reason: 'Internal server error' });
  }
});

socket.on('column-deleted', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'column_delete');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'column-deleted', reason: sessionValidation.reason });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. CRITICAL: Validate board ownership (column deletion requires ownership)
    if (!accessValidation.isOwner) {
      socket.emit('access-denied', { 
        resource: 'column', 
        boardId: data.boardId, 
        reason: 'Column deletion requires board ownership' 
      });
      return;
    }

    // 4. Process column deletion (sticky notes are migrated via API call)
    const deleteData = {
      ...data,
      userId: session.userId,
      timestamp: Date.now()
    };
    io.to(`board:${data.boardId}`).emit('column-deleted', deleteData);
  } catch (error) {
    console.error('❌ Error in column-deleted:', error);
    socket.emit('operation-failed', { operation: 'column-deleted', reason: 'Internal server error' });
  }
});

socket.on('sticky-deleted', async (data) => {
  try {
    // 1. Validate session
    const sessionValidation = await validateSocketSession(socket, session, 'sticky_delete');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { 
        operation: 'sticky-deleted', 
        reason: sessionValidation.reason 
      });
      return;
    }

    // 2. CRITICAL: Validate board access
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { 
        resource: 'board', 
        boardId: data.boardId, 
        reason: accessValidation.reason 
      });
      return;
    }

    // 3. Process sticky deletion (authorization handled by API layer)
    // Note: Sticky deletion permissions are enforced by the API:
    // - Authors can delete their own stickies
    // - Team admins/owners can delete any sticky
    const deleteData = {
      ...data,
      userId: session.userId,
      timestamp: Date.now()
    };
    
    // 4. CRITICAL: Use io.to() so all users see the deletion immediately
    io.to(`board:${data.boardId}`).emit('sticky-deleted', deleteData);
  } catch (error) {
    console.error('❌ Error in sticky-deleted:', error);
    socket.emit('operation-failed', { 
      operation: 'sticky-deleted', 
      reason: 'Internal server error' 
    });
  }
});
```

### `lib/socket-auth-secure.mjs` - Authentication Module

#### Key Functions
1. **`authenticateSocket(socket, options)`** - Authenticates user via JWT token
2. **`validateSocketSession(socket, session, operation)`** - Validates session for operations
3. **`createBoardIsolationMiddleware(session)`** - Returns board access validator with ownership info

#### Team Membership Validation
```javascript
// CRITICAL: This query ensures team-based board isolation
const boardWithTeam = await prisma.board.findUnique({
  where: { id: boardId },
  include: {
    team: {
      include: {
        members: {
          where: { userId: session.userId } // CRITICAL: filters by user
        }
      }
    }
  }
});

// CRITICAL: Check membership length
if (boardWithTeam.team.members.length === 0) {
  return { canAccess: false, reason: `Not a member of this board's team` };
}

// CRITICAL: Check board ownership (required for column operations)
const isOwner = boardWithTeam.ownerId === session.userId;
return { 
  canAccess: true, 
  isOwner: isOwner,
  reason: 'Access granted'
};
```

### `lib/socket-context.tsx` - Client-Side Context

#### Error Event Handlers (Already Implemented)
- `onAuthFailed(callback)` - Authentication failures
- `onOperationFailed(callback)` - Operation failures  
- `onAccessDenied(callback)` - Access denial events

## Common Issues and Solutions

### Issue 1: "ReferenceError: validateSocketSession is not defined" ⚠️ CRITICAL
**Symptom**: `ReferenceError: validateSocketSession is not defined` in socket event handlers
**Cause**: Socket event handlers defined outside the authentication try block
**Solution**: Move ALL `socket.on()` calls inside the authentication try block

**Example of WRONG structure:**
```javascript
try {
  const { validateSocketSession } = await import('./lib/socket-auth-secure.mjs');
  // ... authentication code
} catch (error) {
  // ... error handling
}

// ❌ WRONG: handlers outside try block
socket.on('join-board', async (boardId) => {
  const validation = await validateSocketSession(socket, session, 'join_board'); // ERROR!
});
```

**Example of CORRECT structure:**
```javascript
try {
  const { validateSocketSession } = await import('./lib/socket-auth-secure.mjs');
  // ... authentication code
  
  // ✅ CORRECT: handlers inside try block
  socket.on('join-board', async (boardId) => {
    const validation = await validateSocketSession(socket, session, 'join_board'); // WORKS!
  });
  
} catch (error) {
  // ... error handling
}
```

### Issue 2: "Cannot find module" Error
**Symptom**: `ERR_MODULE_NOT_FOUND` for `.js` file
**Cause**: Importing TypeScript file in Node.js server
**Solution**: Use `.mjs` file with ES6 module syntax

### Issue 3: Cross-Team Data Exposure
**Symptom**: Users seeing data from other teams
**Cause**: Missing team membership validation
**Solution**: Always use `createBoardIsolationMiddleware`

### Issue 4: Authentication Failures
**Symptom**: Socket disconnections, auth-failed events
**Cause**: Missing JWT token or invalid session
**Solution**: Check NextAuth configuration and token extraction

### Issue 5: Prisma Connection Issues
**Symptom**: Database connection errors in socket operations
**Cause**: Prisma client not properly managed
**Solution**: Create new client per operation, always disconnect

## Testing Checklist

### Security Testing
- [ ] User A cannot join User B's team board
- [ ] Proper error messages for access denied
- [ ] Authentication required for all operations
- [ ] Board operations validate team membership
- [ ] Column operations restricted to board owners only
- [ ] Non-owners cannot rename or delete columns
- [ ] Cross-team column access properly blocked

### Functional Testing  
- [ ] Server starts without errors
- [ ] Socket connections authenticate successfully
- [ ] Real-time events work within authorized boards
- [ ] Error handling works for all edge cases
- [ ] Column renaming broadcasts to all board users
- [ ] Column deletion migrates sticky notes correctly
- [ ] Real-time column updates maintain state consistency
- [ ] Board owner authorization works for column operations

### Performance Testing
- [ ] Database queries are efficient
- [ ] Prisma connections are properly managed
- [ ] No memory leaks in socket handling

## Development Workflow

### When Working on Socket Code
1. **Always** reference this documentation first
2. **Never** import TypeScript files in `server.js`
3. **Always** test authentication and authorization
4. **Always** validate team membership for board access
5. **Always** handle errors with proper socket events

### File Modification Guidelines
- **`server.js`**: Only modify socket event handlers, never change import paths to `.ts`
- **`socket-auth-secure.mjs`**: Preferred file for authentication logic
- **`socket-auth-simple.mjs`**: Fallback for simple authentication
- **`socket-context.tsx`**: Client-side socket management

### Debugging Steps
1. Check server startup logs for import errors
2. Verify socket connection in browser dev tools
3. Check authentication flow with console logs
4. Validate database queries in Prisma Studio
5. Test cross-team access scenarios

## Security Considerations

### Board Isolation
- Each board belongs to exactly one team
- Users can only access boards from their teams
- Database queries filter by team membership
- Access violations are logged and blocked

### Session Management  
- JWT tokens validate user identity
- Sessions track user activity and timeouts
- Real-time monitoring for security events
- Proper session cleanup on disconnect

### Error Information
- Never expose sensitive data in error messages
- Log security violations for monitoring
- Provide helpful but secure error responses
- Rate limiting for suspicious activity

## Emergency Procedures

### If Socket Server Breaks
1. Check for TypeScript import errors in `server.js`
2. Verify `.mjs` files exist and are syntactically correct
3. Test basic server startup: `npm run dev`
4. Check authentication flow with test user
5. Validate database connectivity

### If Security is Compromised
1. Immediately check team membership validation
2. Verify `createBoardIsolationMiddleware` is used
3. Audit access logs for violations
4. Test cross-team access scenarios
5. Update security documentation

### If Performance Issues Occur
1. Check Prisma connection management
2. Verify database query efficiency
3. Monitor socket connection counts
4. Check for memory leaks in event handlers
5. Review error handling performance

---

## Current Implementation Status (Last Updated: 2025-07-22)

**Latest Update (Issue #71):** Added real-time sticky note creation with `sticky-created` event

### ✅ Fully Implemented Features
- **User Authentication & Authorization** - Enhanced security with session validation
- **Board Isolation** - Team-based access control with board ownership validation
- **Sticky Note Movement** - Real-time drag & drop with proper authorization
- **Sticky Note Content Editing** - Collaborative editing with real-time updates
- **Sticky Note Deletion** - Real-time deletion with UI consistency (DeleteStickyDialog)
- **Edit History Tracking** - Visual indicators showing who edited each note
- **Editing Indicators** - Live indicators when users are editing notes
- **Column Management** - Create, rename, delete columns (board owner only)
- **Session Management** - Heartbeat system with session monitoring
- **Error Handling** - Comprehensive error events and logging

### 🔧 Critical Implementation Details

**Broadcasting Pattern Fixed (Issue #35, #70):**
- **Content Updates**: Use `io.to()` to broadcast to ALL users including sender
- **Notifications**: Use `socket.to()` to broadcast to others excluding sender
- **Sticky Updates, Moves & Deletions**: Must use `io.to()` so users see their own changes immediately

**Authentication Scope Management:**
- ALL socket event handlers MUST be inside the authentication try block
- Import `socket-auth-secure.mjs` (NEVER `.ts` files)  
- Session data stored as `socket.session`

**Board Access Validation:**
- Every board operation requires `boardAccess()` validation
- Checks team membership automatically
- Column operations require board ownership (`accessValidation.isOwner`)

### 🚨 Known Issues & Limitations
- Server.js uses CommonJS (require) but should ideally use ES modules
- Some TypeScript warnings in authentication modules (non-critical)
- Session timeout/cleanup could be more robust

### 📋 For Future Developers
1. **ALWAYS** read this document before touching real-time code
2. **NEVER** import `.ts` files in `server.js`
3. **ALWAYS** validate sessions and board access
4. **ALWAYS** update this document when adding new socket events
5. **TEST** cross-team access scenarios thoroughly
6. **USE** proper broadcasting patterns (`io.to()` vs `socket.to()`)

---

**Remember**: Socket.io + TypeScript + Node.js has specific compatibility requirements. Always use ES6 modules (`.mjs`) for server-side Socket.io code to avoid import issues.