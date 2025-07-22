# Socket Server Documentation for Retro AI

## ⚠️ CRITICAL: Read Before Any Socket/Real-time Work

**MANDATORY**: Consult this document every time you work on real-time communication, WebSocket, or Socket.io code.

## Architecture Overview

The Retro AI application uses a **standalone Node.js server** (`server.js`) with Socket.io for real-time communication, NOT Next.js API routes for WebSocket handling.

### Server Configuration & Components

| Component | Purpose | Key Rules |
|-----------|---------|-----------|
| **`server.js`** | Main Socket.io server + HTTP server | Import `.mjs` files ONLY, never `.ts` |
| **`lib/socket-auth-secure.mjs`** | Authentication & board authorization | ES6 modules, session validation |
| **`lib/socket-context.tsx`** | Client-side Socket.io integration | React context, error handling |
| **`app/api/socket/route.ts`** | DISABLED Next.js route | Reference only |

**Socket.io Configuration:**
```javascript
const io = new Server(httpServer, {
  path: '/api/socket',
  addTrailingSlash: false,
  transports: ['websocket', 'polling'],
  cors: { origin: process.env.NEXTAUTH_URL || `http://localhost:${port}`, methods: ["GET", "POST"] }
});
```

## 🚨 CRITICAL RULES

### 1. Module Import Rules ⚠️ CRITICAL
- **NEVER import TypeScript files in `server.js`** - Node.js cannot handle `.ts` files
- **ALWAYS use `.mjs` files** for server-side Socket.io code
- ❌ `await import('./lib/socket-auth.ts')` - WILL FAIL
- ✅ `await import('./lib/socket-auth-secure.mjs')` - CORRECT

### 2. Socket Handler Scope Management ⚠️ CRITICAL
- **ALL socket event handlers MUST be inside the authentication try block**
- Authentication imports only available inside try block
- **ALWAYS end try block AFTER all socket event handlers**

### 3. Security & Authorization
- **ALWAYS validate team membership** before board access
- **ALWAYS use `createBoardIsolationMiddleware`** for board operations  
- **NEVER allow cross-team data exposure**
- Column operations require board ownership (`accessValidation.isOwner`)

### 4. Broadcasting Patterns ⚠️ CRITICAL

| Event Type | Use | Reason |
|------------|-----|--------|
| **Content Updates** | `io.to()` | Users must see their own changes |
| **Notifications** | `socket.to()` | Users don't need to see their own actions |

**Examples:**
- `sticky-moved`, `sticky-updated`, `column-renamed` → `io.to()`
- `user-connected`, `editing-started` → `socket.to()`

### 5. Client-Side Performance Rules ⚠️ CRITICAL
- **NEVER use `router.refresh()`** for real-time operations
- **Only ONE component per board** should call `useSocket({ boardId })`
- **Use stable dependencies** in useEffect arrays
- **Use Map over Array** for presence/user tracking

## Socket Events Reference

### Server Events (FROM clients)

| Event | Purpose | Auth Level | Broadcast |
|-------|---------|------------|-----------|
| `join-board` | Join board room | Team member | N/A |
| `sticky-moved` | Move sticky note | Team member | `io.to()` |
| `sticky-updated` | Edit sticky content | Team member | `io.to()` |
| `sticky-created` | Create new sticky | Team member | `io.to()` |
| `sticky-deleted` | Delete sticky | Team member | `io.to()` |
| `column-renamed` | Rename column | Board owner | `io.to()` |
| `column-deleted` | Delete column | Board owner | `io.to()` |
| `editing-start` | Start editing | Team member | `socket.to()` |
| `editing-stop` | Stop editing | Team member | `socket.to()` |
| `timer-set` | Set timer duration | Team member | `io.to()` |
| `timer-started` | Start countdown | Team member | `io.to()` |
| `timer-paused` | Pause countdown | Team member | `io.to()` |
| `timer-stopped` | Stop/reset timer | Team member | `io.to()` |

### Client Events (TO clients)

| Event | Data | Purpose |
|-------|------|---------|
| `user-connected` | `{userId, userName, userEmail, timestamp}` | New user joined |
| `user-disconnected` | `{userId}` | User left board |
| `room-users` | `ActiveUser[]` | Current board users |
| `board-joined` | `{boardId, sessionId, timestamp}` | Join confirmation |
| `auth-failed` | `{reason}` | Authentication error |
| `operation-failed` | `{operation, reason}` | Validation failure |
| `access-denied` | `{resource, reason}` | Authorization failure |
| `timer-set` | `{duration, userId, userName, timestamp}` | Timer duration updated |
| `timer-started` | `{duration, startTime, userId, userName, timestamp}` | Timer countdown started |
| `timer-paused` | `{userId, userName, timestamp}` | Timer countdown paused |
| `timer-stopped` | `{userId, userName, timestamp}` | Timer stopped/reset |

## Standard Socket Event Template

**All socket events follow this pattern:**

```javascript
socket.on('event-name', async (data) => {
  try {
    // 1. Session validation
    const sessionValidation = await validateSocketSession(socket, session, 'operation_name');
    if (!sessionValidation.isValid) {
      socket.emit('operation-failed', { operation: 'event-name', reason: sessionValidation.reason });
      return;
    }

    // 2. Board access validation
    const accessValidation = await boardAccess(data.boardId);
    if (!accessValidation.canAccess) {
      socket.emit('access-denied', { resource: 'board', boardId: data.boardId, reason: accessValidation.reason });
      return;
    }

    // 3. Additional authorization (if needed)
    if (requiresOwnership && !accessValidation.isOwner) {
      socket.emit('access-denied', { resource: 'operation', reason: 'Operation requires board ownership' });
      return;
    }

    // 4. Process operation
    const eventData = { ...data, userId: session.userId, timestamp: Date.now() };
    
    // 5. Broadcast (use io.to() for content, socket.to() for notifications)
    io.to(`board:${data.boardId}`).emit('event-name', eventData);
    
  } catch (error) {
    console.error(`❌ Error in ${eventName}:`, error);
    socket.emit('operation-failed', { operation: 'event-name', reason: 'Internal server error' });
  }
});
```

### Key Event Variations

**Board Join (Most Complex):**
```javascript
socket.on('join-board', async (boardId) => {
  // ... standard validation pattern ...
  
  // Additional: Leave previous board, join new room, presence tracking
  if (currentBoardId && currentBoardId !== boardId) {
    removeUserFromBoard(currentBoardId, session.userId);
    socket.to(`board:${currentBoardId}`).emit('user-disconnected', { userId: session.userId });
  }
  
  socket.join(`board:${boardId}`);
  addUserToBoard(boardId, userData);
  socket.to(`board:${boardId}`).emit('user-connected', userData);
  socket.emit('room-users', getBoardUsers(boardId));
});
```

**Column Operations (Owner Only):**
- Use `requiresOwnership = true` in template
- Additional ownership check: `!accessValidation.isOwner`

## Common Issues & Solutions

### Issue 1: Avatar Re-ordering During Operations ⚠️ CRITICAL

| Problem | Solution | Code Fix |
|---------|----------|----------|
| `router.refresh()` calls | Remove from real-time ops | `emitStickyMoved(data); // No router.refresh()` |
| Multiple `join-board` calls | One component per board | Only `board-canvas.tsx` uses `boardId` |
| Unstable socket deps | Use specific references | `[socket.isConnected, socket.joinBoard, boardId]` |
| Array re-renders | Use Map for presence | `useState<Map<string, ActiveUser>>(new Map())` |

**Why Critical**: Each `router.refresh()` causes page re-authentication → socket reconnection → presence rebuild → avatar re-ordering.

### Issue 2: "ReferenceError: validateSocketSession is not defined"
**Cause**: Socket handlers outside authentication try block  
**Fix**: Move ALL `socket.on()` calls inside try block after authentication import

### Issue 3: Cross-Team Data Exposure  
**Cause**: Missing `boardAccess()` validation  
**Fix**: Always use `createBoardIsolationMiddleware` before operations

### Issue 4: TypeScript Import Errors
**Cause**: Importing `.ts` files in `server.js`  
**Fix**: Use `.mjs` files with ES6 module syntax

## Authentication & Session Management

### Enhanced Authentication Pattern
```javascript
io.on('connection', async (socket) => {
  let session = null;
  let boardAccess = null;
  
  try {
    // Import auth functions (MUST be .mjs)
    const { authenticateSocket, validateSocketSession, createBoardIsolationMiddleware } 
      = await import('./lib/socket-auth-secure.mjs');
    
    // Authenticate with enhanced options
    session = await authenticateSocket(socket, {
      enableFingerprinting: true,
      enableSessionValidation: true,
      enableRealTimeMonitoring: true,
      sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      maxIdleTimeMs: 30 * 60 * 1000 // 30 minutes
    });
    
    if (!session) {
      socket.emit('auth-failed', { reason: 'Authentication required' });
      socket.disconnect();
      return;
    }
    
    // Create board access middleware
    boardAccess = createBoardIsolationMiddleware(session);
    socket.session = session;
    
    // ALL SOCKET HANDLERS GO HERE (inside try block)
    socket.on('join-board', async (boardId) => { /* ... */ });
    socket.on('sticky-moved', async (data) => { /* ... */ });
    // ... all other handlers ...
    
  } catch (error) {
    console.error('❌ Socket authentication error:', error);
    socket.disconnect();
  }
});
```

### Team Membership Validation (Critical Security)
```javascript
// Board isolation query - filters by team membership
const boardWithTeam = await prisma.board.findUnique({
  where: { id: boardId },
  include: {
    team: {
      include: {
        members: {
          where: { userId: session.userId } // CRITICAL: user filter
        }
      }
    }
  }
});

// CRITICAL: Validate membership
if (boardWithTeam.team.members.length === 0) {
  return { canAccess: false, reason: 'Not a member of this board\'s team' };
}

// Check ownership for column operations
const isOwner = boardWithTeam.ownerId === session.userId;
return { canAccess: true, isOwner, reason: 'Access granted' };
```

## Client-Side Best Practices

### Socket Connection Architecture
```javascript
// ✅ CORRECT: Single board connection
// board-canvas.tsx
const { isConnected, emitStickyMoved } = useSocket({ 
  boardId: board.id,
  onStickyMoved: handleStickyMoved 
});

// ✅ CORRECT: Child components without boardId
// column.tsx, sticky-note.tsx
const { emitColumnRenamed } = useSocket(); // No boardId parameter

// ✅ CORRECT: Presence component listens only
// board-presence.tsx
useEffect(() => {
  socket.on('user-connected', handleUserConnected);
  socket.on('user-disconnected', handleUserDisconnected);
  // No socket.emit('join-board') call
}, [socket]);
```

### Performance Requirements
- **WebSocket-first**: Use socket events for UI updates, never `router.refresh()`
- **Stable dependencies**: `[socket.isConnected, socket.joinBoard, boardId]` not `[socketContext, boardId]`
- **Map for presence**: `useState<Map<string, ActiveUser>>()` for O(1) operations
- **One board joiner**: Only one component calls `useSocket({ boardId })` per board

## Testing & Validation

### Security Testing Checklist
- [ ] Cross-team board access properly blocked
- [ ] Column operations restricted to board owners
- [ ] Authentication required for all operations
- [ ] Proper error messages for access denied

### Performance Testing Checklist  
- [ ] **CRITICAL**: No `router.refresh()` during real-time operations
- [ ] **CRITICAL**: Only one component calls `join-board` per boardId
- [ ] **CRITICAL**: Presence indicators stable during board operations
- [ ] **CRITICAL**: No socket reconnections during normal usage
- [ ] Socket dependency arrays use stable references

### Functional Testing Checklist
- [ ] Real-time events work within authorized boards
- [ ] Broadcasting patterns correct (`io.to()` vs `socket.to()`)
- [ ] Error handling works for edge cases
- [ ] Database queries efficient with proper cleanup

## Emergency Procedures

### Socket Server Issues
1. Check for `.ts` import errors in `server.js`
2. Verify `.mjs` files exist and syntactically correct
3. Test server startup: `npm run dev`
4. Validate authentication flow

### Security Compromise
1. Check team membership validation in all board operations
2. Verify `createBoardIsolationMiddleware` usage
3. Audit access logs for violations
4. Test cross-team access scenarios

### Performance Issues
1. Check for `router.refresh()` calls in real-time operations
2. Verify only one component handles board joining per boardId
3. Monitor socket connection/reconnection patterns
4. Review presence indicator stability

---

## Current Status (Last Updated: 2025-07-22)

### ✅ Fully Implemented
- **Enhanced Authentication** - Session validation with board isolation
- **User Presence Tracking** - Real-time avatars with stable ordering (Issue #38 resolved)
- **Real-time Collaboration** - Sticky notes, columns, editing indicators
- **Timer Component** - Synchronized countdown timers for all board participants (Issue #73 resolved)
- **Broadcasting Patterns** - Correct `io.to()` vs `socket.to()` usage
- **Performance Optimizations** - No `router.refresh()`, stable socket connections
- **Security** - Team-based access control, board ownership validation

### 🔧 Critical Lessons Learned
- **Never use `router.refresh()` for real-time operations** - causes socket reconnections
- **One component per board for socket joining** - prevents duplicate connections  
- **Use Map for presence tracking** - O(1) operations vs O(n) array operations
- **Stable socket dependencies** - prevents unnecessary reconnections

### 📋 For Future Developers
1. **READ THIS DOC** before touching real-time code
2. **USE `.mjs` files** for server-side Socket.io (never `.ts`)
3. **VALIDATE** sessions and board access for every operation
4. **TEST** cross-team scenarios and performance impact
5. **UPDATE** this doc when adding socket events

---

**Remember**: Real-time collaboration requires careful attention to performance, security, and state management. Always prioritize WebSocket events over page refreshes for optimal user experience.