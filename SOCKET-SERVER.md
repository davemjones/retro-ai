# Socket Server Documentation for Retro AI

## ⚠️ CRITICAL: Read Before Any Socket/Real-time Work

**MANDATORY**: Consult this document every time you work on real-time communication, WebSocket, or Socket.io code.

## Architecture Overview

The Retro AI application uses a **standalone Node.js server** (`server.js`) with Socket.io for real-time communication, NOT Next.js API routes for WebSocket handling.

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

#### 3. Board Operations (sticky-moved, editing-start, etc.)
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
    socket.to(`board:${data.boardId}`).emit('sticky-moved', movementData);
  } catch (error) {
    console.error('❌ Error in sticky-moved:', error);
    socket.emit('operation-failed', { operation: 'sticky-moved', reason: 'Internal server error' });
  }
});
```

### `lib/socket-auth-secure.mjs` - Authentication Module

#### Key Functions
1. **`authenticateSocket(socket, options)`** - Authenticates user via JWT token
2. **`validateSocketSession(socket, session, operation)`** - Validates session for operations
3. **`createBoardIsolationMiddleware(session)`** - Returns board access validator

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

### Functional Testing  
- [ ] Server starts without errors
- [ ] Socket connections authenticate successfully
- [ ] Real-time events work within authorized boards
- [ ] Error handling works for all edge cases

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

**Remember**: Socket.io + TypeScript + Node.js has specific compatibility requirements. Always use ES6 modules (`.mjs`) for server-side Socket.io code to avoid import issues.